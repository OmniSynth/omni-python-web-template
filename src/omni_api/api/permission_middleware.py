"""基于数据库 API 路径映射的权限中间件。"""

from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from omni_api.data.mysql.request_context import set_permission_denied_code
from omni_api.services.audit_service import AuditService
from omni_api.services.auth_service import AuthService
from omni_api.services.permission_service import PermissionService
from omni_api.services.session_service import SessionService

logger = logging.getLogger(__name__)

_SKIP_PREFIXES = (
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/logout",
    "/api/v1/auth/me",
    "/api/v1/auth/nav",
    "/api/v1/auth/tenants",
    "/api/v1/auth/switch-tenant",
    "/api/v1/users/me/",
    "/assets/",
)

_TENANT_SELECT_ALLOWED = frozenset({"auth.switch_tenant", "auth.tenants"})


class PermissionMiddleware(BaseHTTPMiddleware):
    """根据 DB 中 api 路径映射校验已登录用户的接口权限。"""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if not path.startswith("/api/v1/"):
            return await call_next(request)
        if any(path.startswith(p) for p in _SKIP_PREFIXES):
            return await call_next(request)

        auth = request.headers.get("Authorization")
        if not auth or not auth.lower().startswith("bearer "):
            return await call_next(request)

        token = auth[7:].strip()
        if not token:
            return await call_next(request)

        svc = PermissionService()
        required = await svc.resolve_api_permission(request.method, path)
        if required is None:
            return await call_next(request)

        session = await SessionService().resolve(token)
        if session is None:
            return await call_next(request)

        if session.get("need_tenant_select") and required not in _TENANT_SELECT_ALLOWED:
            user = await AuthService().get_user(int(session["user_id"]))
            if user is None:
                return await call_next(request)
            return await self._deny(
                user, required, error_detail="请先选择租户", summary_detail="请先选择租户"
            )

        perms = session.get("permissions")
        if perms and not session.get("need_tenant_select"):
            allowed = required in perms
        else:
            user = await AuthService().get_user(int(session["user_id"]))
            if user is None:
                return await call_next(request)
            allowed = await svc.user_has_permission(
                user.id, required, session.get("tenant_id")
            )

        if allowed:
            return await call_next(request)

        user = await AuthService().get_user(int(session["user_id"]))
        if user is None:
            return await call_next(request)
        return await self._deny(user, required)

    async def _deny(
        self,
        user,
        required: str,
        *,
        error_detail: str = "无权限",
        summary_detail: str | None = None,
    ) -> JSONResponse:
        set_permission_denied_code(required)
        await AuditService().record_operation(
            category="auth",
            action="permission_denied",
            level="system",
            actor_id=user.id,
            actor_username=user.username,
            resource_type="permission",
            resource_id=required,
            result="failure",
            error_detail=summary_detail or error_detail,
            permission_code=required,
        )
        return JSONResponse(status_code=403, content={"detail": error_detail})
