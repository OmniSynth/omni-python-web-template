"""请求上下文：当前租户与会话。"""

from __future__ import annotations

from contextvars import ContextVar, Token
from typing import Any

_session_var: ContextVar[dict[str, Any] | None] = ContextVar("session", default=None)
_tenant_id_var: ContextVar[int | None] = ContextVar("tenant_id", default=None)
_dept_id_var: ContextVar[int | None] = ContextVar("dept_id", default=None)
_user_id_var: ContextVar[int | None] = ContextVar("tenant_user_id", default=None)


def set_session(session: dict[str, Any] | None) -> Token:
    if session is None:
        _tenant_id_var.set(None)
        _dept_id_var.set(None)
        _user_id_var.set(None)
    else:
        tid = session.get("tenant_id")
        did = session.get("dept_id")
        _tenant_id_var.set(int(tid) if tid is not None else None)
        _dept_id_var.set(int(did) if did is not None else None)
        _user_id_var.set(int(session["user_id"]) if session.get("user_id") else None)
    return _session_var.set(session)


def reset_session(token: Token) -> None:
    _session_var.reset(token)
    _tenant_id_var.set(None)
    _dept_id_var.set(None)
    _user_id_var.set(None)


def get_session() -> dict[str, Any] | None:
    return _session_var.get()


def get_tenant_id() -> int | None:
    return _tenant_id_var.get()


def get_dept_id() -> int | None:
    return _dept_id_var.get()


def get_context_user_id() -> int | None:
    return _user_id_var.get()


def set_tenant_id(tenant_id: int | None) -> Token:
    return _tenant_id_var.set(tenant_id)


def reset_tenant_id(token: Token) -> None:
    _tenant_id_var.reset(token)


def set_dept_id(dept_id: int | None) -> Token:
    return _dept_id_var.set(dept_id)


def reset_dept_id(token: Token) -> None:
    _dept_id_var.reset(token)


def set_user_id(user_id: int | None) -> Token:
    return _user_id_var.set(user_id)


def reset_user_id(token: Token) -> None:
    _user_id_var.reset(token)


def require_tenant_id() -> int:
    tid = get_tenant_id()
    if tid is None:
        raise ValueError("未选择租户")
    return tid


def resolve_tenant_id(*, explicit: int | None = None) -> int:
    """解析当前租户 ID；无显式值且无请求上下文时抛出异常。"""
    if explicit is not None:
        return explicit
    tid = get_tenant_id()
    if tid is not None:
        return tid
    raise ValueError("缺少租户上下文")
