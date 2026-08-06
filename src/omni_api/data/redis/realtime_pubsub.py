"""实时事件 Redis pub/sub；不可达时回退为进程内广播。"""

from __future__ import annotations

import json
import logging
import threading
from collections.abc import Callable
from typing import Any

import redis
from redis.client import PubSub

from omni_api.data.redis.client import redis_client

logger = logging.getLogger(__name__)

_CHANNEL = "omni:realtime:bus"

_LocalHandler = Callable[[dict[str, Any]], None]


class RealtimePubSub:
    """跨进程扇出；单进程回退时仅调用本地 handler。"""

    def __init__(self) -> None:
        self._local_handlers: list[_LocalHandler] = []
        self._lock = threading.Lock()
        self._listener_thread: threading.Thread | None = None
        self._pubsub: PubSub | None = None
        self._stop = threading.Event()
        self._redis_ok = True

    def add_local_handler(self, handler: _LocalHandler) -> None:
        with self._lock:
            self._local_handlers.append(handler)

    def remove_local_handler(self, handler: _LocalHandler) -> None:
        with self._lock:
            if handler in self._local_handlers:
                self._local_handlers.remove(handler)

    def publish(self, envelope: dict[str, Any]) -> None:
        payload = json.dumps(envelope, ensure_ascii=False, default=str)
        if self._redis_ok:
            try:
                redis_client().publish(_CHANNEL, payload)
                return
            except redis.RedisError:
                self._redis_ok = False
                logger.warning("Redis 不可用，实时事件回退到进程内广播")
        self._deliver_local(envelope)

    def start_listener(self) -> None:
        if self._listener_thread is not None and self._listener_thread.is_alive():
            return
        self._stop.clear()
        self._listener_thread = threading.Thread(
            target=self._listen_loop, name="realtime-pubsub", daemon=True
        )
        self._listener_thread.start()

    def stop_listener(self) -> None:
        self._stop.set()
        pubsub = self._pubsub
        if pubsub is not None:
            try:
                pubsub.close()
            except Exception:
                logger.debug("关闭 realtime pubsub 失败", exc_info=True)
        if self._listener_thread is not None:
            self._listener_thread.join(timeout=2)
            self._listener_thread = None

    def _deliver_local(self, envelope: dict[str, Any]) -> None:
        with self._lock:
            handlers = list(self._local_handlers)
        for handler in handlers:
            try:
                handler(envelope)
            except Exception:
                logger.exception("实时本地 handler 异常")

    def _listen_loop(self) -> None:
        while not self._stop.is_set():
            try:
                self._consume_once()
            except redis.RedisError:
                self._redis_ok = False
                logger.warning("Redis realtime 监听断开，2s 后重试")
                if self._stop.wait(2):
                    break
            except Exception:
                logger.exception("Redis realtime 监听异常")
                if self._stop.wait(2):
                    break

    def _consume_once(self) -> None:
        client = redis_client()
        pubsub = client.pubsub(ignore_subscribe_messages=True)
        pubsub.subscribe(_CHANNEL)
        self._pubsub = pubsub
        self._redis_ok = True
        for message in pubsub.listen():
            if self._stop.is_set():
                break
            self._handle_pubsub_message(message)

    def _handle_pubsub_message(self, message: dict[str, Any]) -> None:
        if message.get("type") != "message":
            return
        raw = message.get("data")
        if not isinstance(raw, str):
            return
        try:
            envelope = json.loads(raw)
        except json.JSONDecodeError:
            return
        if isinstance(envelope, dict):
            self._deliver_local(envelope)

_BUS = RealtimePubSub()


def realtime_pubsub() -> RealtimePubSub:
    return _BUS
