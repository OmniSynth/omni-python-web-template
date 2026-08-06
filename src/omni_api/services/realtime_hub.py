"""实时连接 Hub：订阅校验、本地投递、跨进程扇出、auth.session 探测。"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from omni_api.data.redis.realtime_pubsub import realtime_pubsub
from omni_api.schemas.auth import AuthUser
from omni_api.schemas.realtime import (
    CHANNEL_AUTH_SESSION,
    CHANNEL_PERMISSIONS,
    FIXED_CHANNELS,
    EventType,
    RealtimeServerMessage,
)
from omni_api.services.auth_credentials import AuthError
from omni_api.services.session_service import SessionService

logger = logging.getLogger(__name__)

_AUTH_PROBE_INTERVAL_SEC = 5.0
_SCOPE_USER = "user"
_SCOPE_TENANT = "tenant"
_SCOPE_SESSION = "session"


@dataclass
class RealtimeConnection:
    websocket: WebSocket
    token: str
    user_id: int
    tenant_id: int | None
    permissions: frozenset[str]
    channels: set[str] = field(default_factory=set)
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class RealtimeHub:
    """进程内连接表 + Redis 桥接。"""

    def __init__(self) -> None:
        self._conns: list[RealtimeConnection] = []
        self._lock = asyncio.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._auth_tasks: dict[str, asyncio.Task[None]] = {}
        self._auth_fingerprints: dict[str, str] = {}
        self._started = False

    async def startup(self) -> None:
        if self._started:
            return
        self._loop = asyncio.get_running_loop()
        bus = realtime_pubsub()
        bus.add_local_handler(self._on_bus_message)
        bus.start_listener()
        self._started = True

    async def shutdown(self) -> None:
        bus = realtime_pubsub()
        bus.remove_local_handler(self._on_bus_message)
        bus.stop_listener()
        for task in list(self._auth_tasks.values()):
            task.cancel()
        self._auth_tasks.clear()
        async with self._lock:
            conns = list(self._conns)
            self._conns.clear()
        for conn in conns:
            await self._safe_close(conn)

    async def register(self, conn: RealtimeConnection) -> None:
        async with self._lock:
            if conn not in self._conns:
                self._conns.append(conn)

    async def unregister(self, conn: RealtimeConnection) -> None:
        async with self._lock:
            if conn in self._conns:
                self._conns.remove(conn)
            channels = set(conn.channels)
            conn.channels.clear()
        for ch in channels:
            await self._maybe_stop_auth_probe(ch, conn.token)

    async def subscribe(self, conn: RealtimeConnection, channels: list[str]) -> list[str]:
        accepted: list[str] = []
        for channel in channels:
            ok, err = await self._validate_channel(conn, channel)
            if not ok:
                await self._send(conn, RealtimeServerMessage(op="error", message=err))
                continue
            conn.channels.add(channel)
            accepted.append(channel)
            if channel == CHANNEL_AUTH_SESSION:
                await self._ensure_auth_probe(conn.token)
                await self._push_auth_snapshot(conn)
        if accepted:
            await self._send(
                conn, RealtimeServerMessage(op="subscribed", channels=accepted)
            )
        return accepted

    async def unsubscribe(self, conn: RealtimeConnection, channels: list[str]) -> list[str]:
        removed: list[str] = []
        for channel in channels:
            if channel in conn.channels:
                conn.channels.discard(channel)
                removed.append(channel)
                await self._maybe_stop_auth_probe(channel, conn.token)
        if removed:
            await self._send(
                conn, RealtimeServerMessage(op="unsubscribed", channels=removed)
            )
        return removed

    def publish_user(
        self,
        *,
        tenant_id: int,
        user_id: int,
        channel: str,
        event_type: EventType,
        payload: dict[str, Any],
    ) -> None:
        self._publish_envelope(
            {
                "scope": _SCOPE_USER,
                "tenant_id": tenant_id,
                "user_id": user_id,
                "channel": channel,
                "type": event_type,
                "payload": payload,
            }
        )

    def publish_tenant(
        self,
        *,
        tenant_id: int,
        channel: str,
        event_type: EventType,
        payload: dict[str, Any],
    ) -> None:
        self._publish_envelope(
            {
                "scope": _SCOPE_TENANT,
                "tenant_id": tenant_id,
                "channel": channel,
                "type": event_type,
                "payload": payload,
            }
        )

    def publish_session(
        self,
        *,
        token: str,
        channel: str,
        event_type: EventType,
        payload: dict[str, Any],
    ) -> None:
        self._publish_envelope(
            {
                "scope": _SCOPE_SESSION,
                "token": token,
                "channel": channel,
                "type": event_type,
                "payload": payload,
            }
        )

    def _publish_envelope(self, envelope: dict[str, Any]) -> None:
        realtime_pubsub().publish(envelope)

    def _on_bus_message(self, envelope: dict[str, Any]) -> None:
        loop = self._loop
        if loop is None or loop.is_closed():
            return

        def _schedule(env: dict[str, Any] = envelope) -> None:
            asyncio.create_task(self._deliver_envelope(env))

        loop.call_soon_threadsafe(_schedule)

    async def _deliver_envelope(self, envelope: dict[str, Any]) -> None:
        channel = str(envelope.get("channel") or "")
        event_type = str(envelope.get("type") or "changed")
        payload = envelope.get("payload")
        if not isinstance(payload, dict):
            payload = {}
        msg = RealtimeServerMessage(
            op="event",
            channel=channel,
            type=event_type if event_type in ("update", "changed", "snapshot") else "changed",
            payload=payload,
        )
        async with self._lock:
            targets = [c for c in self._conns if self._match(c, envelope, channel)]
        for conn in targets:
            await self._send(conn, msg)

    def _match(
        self, conn: RealtimeConnection, envelope: dict[str, Any], channel: str
    ) -> bool:
        if channel not in conn.channels:
            return False
        scope = envelope.get("scope")
        if scope == _SCOPE_USER:
            return (
                conn.tenant_id == envelope.get("tenant_id")
                and conn.user_id == envelope.get("user_id")
            )
        if scope == _SCOPE_TENANT:
            return conn.tenant_id == envelope.get("tenant_id")
        if scope == _SCOPE_SESSION:
            return conn.token == envelope.get("token")
        return False

    async def _validate_channel(
        self, conn: RealtimeConnection, channel: str
    ) -> tuple[bool, str]:
        if channel not in FIXED_CHANNELS:
            return False, "未知频道"
        required = CHANNEL_PERMISSIONS.get(channel)
        if required and required not in conn.permissions:
            return False, "无权限"
        if channel != CHANNEL_AUTH_SESSION and conn.tenant_id is None:
            return False, "请先选择租户"
        return True, ""

    async def _send(self, conn: RealtimeConnection, msg: RealtimeServerMessage) -> None:
        data = msg.model_dump(exclude_none=True)
        try:
            async with conn.send_lock:
                await conn.websocket.send_json(data)
        except (WebSocketDisconnect, RuntimeError):
            await self.unregister(conn)
        except Exception:
            logger.debug("实时发送失败 user=%s", conn.user_id, exc_info=True)
            await self.unregister(conn)

    async def _safe_close(self, conn: RealtimeConnection) -> None:
        try:
            await conn.websocket.close()
        except Exception:
            logger.debug("关闭实时连接失败", exc_info=True)

    async def _ensure_auth_probe(self, token: str) -> None:
        task = self._auth_tasks.get(token)
        if task is not None and not task.done():
            return
        self._auth_tasks[token] = asyncio.create_task(
            self._auth_probe_loop(token), name=f"auth-probe-{token[:8]}"
        )

    async def _maybe_stop_auth_probe(self, channel: str, token: str) -> None:
        if channel != CHANNEL_AUTH_SESSION:
            return
        async with self._lock:
            still = any(
                CHANNEL_AUTH_SESSION in c.channels and c.token == token
                for c in self._conns
            )
        if still:
            return
        task = self._auth_tasks.pop(token, None)
        self._auth_fingerprints.pop(token, None)
        if task is not None:
            task.cancel()

    async def _push_auth_snapshot(self, conn: RealtimeConnection) -> None:
        try:
            user = await SessionService().refresh(conn.token)
        except AuthError:
            await self._safe_close(conn)
            return
        self._auth_fingerprints[conn.token] = _auth_fingerprint(user)
        await self._send(
            conn,
            RealtimeServerMessage(
                op="event",
                channel=CHANNEL_AUTH_SESSION,
                type="snapshot",
                payload=user.model_dump(mode="json"),
            ),
        )

    async def _auth_probe_loop(self, token: str) -> None:
        try:
            while True:
                await asyncio.sleep(_AUTH_PROBE_INTERVAL_SEC)
                async with self._lock:
                    has_sub = any(
                        CHANNEL_AUTH_SESSION in c.channels and c.token == token
                        for c in self._conns
                    )
                if not has_sub:
                    break
                try:
                    user = await SessionService().refresh(token)
                except AuthError:
                    break
                fp = _auth_fingerprint(user)
                if self._auth_fingerprints.get(token) == fp:
                    continue
                self._auth_fingerprints[token] = fp
                self.publish_session(
                    token=token,
                    channel=CHANNEL_AUTH_SESSION,
                    event_type="snapshot",
                    payload=user.model_dump(mode="json"),
                )
        except asyncio.CancelledError:
            return
        finally:
            self._auth_tasks.pop(token, None)
            self._auth_fingerprints.pop(token, None)


def _auth_fingerprint(user: AuthUser) -> str:
    roles = "\0".join(sorted(user.roles))
    perms = "\0".join(sorted(user.permissions))
    return (
        f"{user.tenant_id}|{int(user.tenant_expired)}|{int(user.need_tenant_select)}"
        f"|{roles}|{perms}|{user.display_name}|{user.avatar_url or ''}"
    )


_HUB = RealtimeHub()


def realtime_hub() -> RealtimeHub:
    return _HUB
