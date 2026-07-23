"""HTTP 请求上下文（request_id、客户端指纹）。"""

from __future__ import annotations

from contextvars import ContextVar, Token

_request_id: ContextVar[str | None] = ContextVar("http_request_id", default=None)
_client_ip: ContextVar[str | None] = ContextVar("http_client_ip", default=None)
_user_agent: ContextVar[str | None] = ContextVar("http_user_agent", default=None)
_permission_denied_code: ContextVar[str | None] = ContextVar(
    "http_permission_denied_code", default=None
)


def get_request_id() -> str | None:
    return _request_id.get()


def set_request_id(request_id: str) -> Token:
    return _request_id.set(request_id)


def reset_request_id(token: Token) -> None:
    _request_id.reset(token)


def get_client_ip() -> str | None:
    return _client_ip.get()


def set_client_ip(ip: str | None) -> Token:
    return _client_ip.set(ip)


def reset_client_ip(token: Token) -> None:
    _client_ip.reset(token)


def get_user_agent() -> str | None:
    return _user_agent.get()


def set_user_agent(ua: str | None) -> Token:
    return _user_agent.set(ua)


def reset_user_agent(token: Token) -> None:
    _user_agent.reset(token)


def get_permission_denied_code() -> str | None:
    return _permission_denied_code.get()


def set_permission_denied_code(code: str | None) -> Token:
    return _permission_denied_code.set(code)


def reset_permission_denied_code(token: Token) -> None:
    _permission_denied_code.reset(token)


_http_path: ContextVar[str | None] = ContextVar("http_path", default=None)
_http_method: ContextVar[str | None] = ContextVar("http_method", default=None)


def get_http_path() -> str | None:
    return _http_path.get()


def set_http_path(path: str | None) -> Token:
    return _http_path.set(path)


def reset_http_path(token: Token) -> None:
    _http_path.reset(token)


def get_http_method() -> str | None:
    return _http_method.get()


def set_http_method(method: str | None) -> Token:
    return _http_method.set(method)


def reset_http_method(token: Token) -> None:
    _http_method.reset(token)
