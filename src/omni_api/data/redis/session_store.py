"""Redis Session 存储。"""

from __future__ import annotations

import json
import re
import time
import uuid
from typing import Any

import redis

from omni_api.config.settings import AuthSettings, get_settings
from omni_api.data.redis.client import redis_client

_TOKEN_RE = re.compile(r"^[0-9a-f]{32}$")
_SESSION_PREFIX = "session:"
_USER_SESSIONS_PREFIX = "user_sessions:"
_MEM_SESSIONS: dict[str, tuple[float, dict[str, Any]]] = {}
_MEM_USER_TOKENS: dict[int, set[str]] = {}


def _session_key(token: str) -> str:
    return f"{_SESSION_PREFIX}{token}"


def _user_sessions_key(user_id: int) -> str:
    return f"{_USER_SESSIONS_PREFIX}{user_id}"


def _token_str(token: bytes | str) -> str:
    return token.decode() if isinstance(token, bytes) else str(token)


def is_valid_token(token: str) -> bool:
    """校验 session_token 为 32 位十六进制。"""
    return bool(_TOKEN_RE.match(token))


def _memory_get(token: str) -> dict[str, Any] | None:
    item = _MEM_SESSIONS.get(token)
    if item is None:
        return None
    expires_at, data = item
    if expires_at <= time.time():
        _MEM_SESSIONS.pop(token, None)
        return None
    return dict(data)


def _memory_set(token: str, data: dict[str, Any], ttl_seconds: int) -> None:
    _MEM_SESSIONS[token] = (time.time() + ttl_seconds, dict(data))
    user_id = data.get("user_id")
    if user_id is not None:
        _MEM_USER_TOKENS.setdefault(int(user_id), set()).add(token)


class SessionStore:
    """Redis 会话 CRUD。"""

    def __init__(
        self,
        client: redis.Redis | None = None,
        settings: AuthSettings | None = None,
    ) -> None:
        self._redis = client or redis_client()
        self._cfg = settings or get_settings().auth

    @property
    def ttl_seconds(self) -> int:
        return self._cfg.session_ttl_hours * 3600

    def create(self, data: dict[str, Any]) -> str:
        """创建会话，返回 session_token。"""
        token = uuid.uuid4().hex
        key = _session_key(token)
        payload = json.dumps(data, default=str)
        try:
            self._redis.setex(key, self.ttl_seconds, payload)
            user_id = data.get("user_id")
            if user_id is not None:
                usk = _user_sessions_key(int(user_id))
                self._redis.sadd(usk, token)
                self._redis.expire(usk, self.ttl_seconds)
        except redis.RedisError:
            # ponytail: single-process fallback for local dev when cloud Redis is unreachable.
            _memory_set(token, data, self.ttl_seconds)
        return token

    def get(self, token: str) -> dict[str, Any] | None:
        if not is_valid_token(token):
            return None
        try:
            raw = self._redis.get(_session_key(token))
        except redis.RedisError:
            return _memory_get(token)
        if raw is None:
            return _memory_get(token)
        return json.loads(raw)

    def update(self, token: str, patch: dict[str, Any]) -> dict[str, Any] | None:
        current = self.get(token)
        if current is None:
            return None
        current.update(patch)
        key = _session_key(token)
        try:
            self._redis.setex(key, self.ttl_seconds, json.dumps(current, default=str))
        except redis.RedisError:
            _memory_set(token, current, self.ttl_seconds)
        return current

    def delete(self, token: str) -> None:
        if not is_valid_token(token):
            return
        data = self.get(token)
        key = _session_key(token)
        try:
            self._redis.delete(key)
            if data and data.get("user_id") is not None:
                self._redis.srem(_user_sessions_key(int(data["user_id"])), token)
        except redis.RedisError:
            pass
        _MEM_SESSIONS.pop(token, None)
        if data and data.get("user_id") is not None:
            _MEM_USER_TOKENS.get(int(data["user_id"]), set()).discard(token)

    def revoke_user(self, user_id: int) -> None:
        usk = _user_sessions_key(user_id)
        try:
            tokens = self._redis.smembers(usk)
            for token in tokens:
                self._redis.delete(_session_key(_token_str(token)))
            self._redis.delete(usk)
        except redis.RedisError:
            pass
        for token in _MEM_USER_TOKENS.pop(user_id, set()):
            _MEM_SESSIONS.pop(token, None)

    def revoke_other_sessions(self, user_id: int, keep_token: str) -> None:
        for token in self.list_user_tokens(user_id):
            if token != keep_token:
                self.delete(token)

    def list_user_tokens(self, user_id: int) -> list[str]:
        usk = _user_sessions_key(user_id)
        try:
            tokens = self._redis.smembers(usk)
        except redis.RedisError:
            tokens = []
        result = [_token_str(token) for token in tokens]
        result.extend(t for t in _MEM_USER_TOKENS.get(user_id, set()) if _memory_get(t))
        return result
