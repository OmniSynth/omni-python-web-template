"""请求级 Session resolve 缓存（绑定 request.state，跨中间件共享）。"""

from __future__ import annotations

from contextvars import ContextVar, Token
from typing import Any

from starlette.requests import Request

_request_ctx: ContextVar[Request | None] = ContextVar("http_request", default=None)
_MISSING = object()


def bind_request(request: Request) -> Token:
    """将当前 HTTP 请求绑定到 ContextVar，供 resolve 读写 request.state 缓存。"""
    if not hasattr(request.state, "session_resolve_cache"):
        request.state.session_resolve_cache = {}
    if not hasattr(request.state, "tenant_active_cache"):
        request.state.tenant_active_cache = {}
    return _request_ctx.set(request)


def unbind_request(token: Token) -> None:
    _request_ctx.reset(token)


def _cache_bucket() -> dict[str, dict[str, Any] | None] | None:
    request = _request_ctx.get()
    if request is None:
        return None
    cache = getattr(request.state, "session_resolve_cache", None)
    if cache is None:
        cache = {}
        request.state.session_resolve_cache = cache
    return cache


def get_cached_session(token: str) -> dict[str, Any] | None | object:
    cache = _cache_bucket()
    if cache is None:
        return _MISSING
    if token not in cache:
        return _MISSING
    return cache[token]


def set_cached_session(token: str, session: dict[str, Any] | None) -> None:
    cache = _cache_bucket()
    if cache is not None:
        cache[token] = session


def _tenant_active_bucket() -> dict[str, bool] | None:
    request = _request_ctx.get()
    if request is None:
        return None
    cache = getattr(request.state, "tenant_active_cache", None)
    if cache is None:
        cache = {}
        request.state.tenant_active_cache = cache
    return cache


def get_cached_tenant_active(user_id: int, tenant_id: int) -> bool | object:
    cache = _tenant_active_bucket()
    if cache is None:
        return _MISSING
    key = f"{user_id}:{tenant_id}"
    if key not in cache:
        return _MISSING
    return cache[key]


def set_cached_tenant_active(user_id: int, tenant_id: int, active: bool) -> None:
    cache = _tenant_active_bucket()
    if cache is not None:
        cache[f"{user_id}:{tenant_id}"] = active
