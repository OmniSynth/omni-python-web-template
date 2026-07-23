"""将当前登录用户注入 MySQL 操作人上下文。"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from omni_api.data.mysql.actor import (
    reset_actor_token,
    reset_actor_username_token,
    set_actor_id,
    set_actor_username,
)
from omni_api.data.mysql.tenant_context import reset_session, set_session
from omni_api.services.session_service import SessionService


class ActorMiddleware(BaseHTTPMiddleware):
    """从 Bearer Session 解析用户 ID，供仓储层写入 created_by / updated_by。"""

    async def dispatch(self, request: Request, call_next) -> Response:
        actor_id: int | None = None
        actor_username: str | None = None
        session_token: str | None = None
        auth = request.headers.get("Authorization")
        if auth and auth.lower().startswith("bearer "):
            session_token = auth[7:].strip() or None
        session = None
        if session_token:
            session = await SessionService().resolve(session_token)
            if session:
                actor_id = int(session["user_id"])
                actor_username = str(session.get("username") or "")
        id_token = set_actor_id(actor_id)
        name_token = set_actor_username(actor_username)
        sess_token = set_session(session)
        try:
            return await call_next(request)
        finally:
            reset_session(sess_token)
            reset_actor_username_token(name_token)
            reset_actor_token(id_token)
