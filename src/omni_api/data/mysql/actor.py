"""MySQL 写入操作人上下文（当前登录用户 ID）。"""

from __future__ import annotations

from contextvars import ContextVar, Token

_actor_id: ContextVar[int | None] = ContextVar("mysql_actor_id", default=None)
_actor_username: ContextVar[str | None] = ContextVar("mysql_actor_username", default=None)


def get_actor_id() -> int | None:
    """返回当前请求/任务上下文中的操作人用户 ID。"""
    return _actor_id.get()


def get_actor_username() -> str | None:
    """返回当前请求/任务上下文中的操作人用户名。"""
    return _actor_username.get()


def set_actor_id(user_id: int | None) -> Token:
    """设置操作人，返回 reset 用 token。"""
    return _actor_id.set(user_id)


def set_actor_username(username: str | None) -> Token:
    """设置操作人用户名，返回 reset 用 token。"""
    return _actor_username.set(username)


def reset_actor_token(token: Token) -> None:
    """恢复先前的操作人上下文。"""
    _actor_id.reset(token)


def reset_actor_username_token(token: Token) -> None:
    """恢复先前的操作人用户名上下文。"""
    _actor_username.reset(token)
