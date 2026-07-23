"""API 依赖：当前用户与 RBAC 鉴权。"""

from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from omni_api.data.mysql.request_context import set_permission_denied_code
from omni_api.data.mysql.tenant_context import get_tenant_id
from omni_api.schemas.auth import UserRecord
from omni_api.services.audit_service import AuditService
from omni_api.services.auth_service import AuthService
from omni_api.services.permission_service import PermissionService
from omni_api.services.session_service import SessionService

_bearer = HTTPBearer(auto_error=False)


def _extract_token(credentials: HTTPAuthorizationCredentials | None) -> str | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    return credentials.credentials.strip() or None


async def get_session_data(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    token = _extract_token(credentials)
    if not token:
        raise HTTPException(status_code=401, detail="未登录")
    session = await SessionService().resolve(token)
    if session is None:
        raise HTTPException(status_code=401, detail="登录已失效，请重新登录")
    return session


async def get_session_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str | None:
    return _extract_token(credentials)


async def get_current_user(session: dict = Depends(get_session_data)) -> UserRecord:
    user = await AuthService().get_user(int(session["user_id"]))
    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在或已禁用")
    return user


def require_permission(code: str):
    """要求当前用户拥有指定权限码。"""

    async def _dep(
        user: UserRecord = Depends(get_current_user),
        session: dict = Depends(get_session_data),
    ) -> UserRecord:
        if session.get("need_tenant_select") and code not in (
            "auth.switch_tenant",
            "auth.tenants",
        ):
            raise HTTPException(status_code=403, detail="请先选择租户")
        tid = get_tenant_id()
        if not await PermissionService(tenant_id=tid).user_has_permission(
            user.id, code, tid
        ):
            set_permission_denied_code(code)
            await AuditService().record_operation(
                category="auth",
                action="permission_denied",
                level="system",
                actor_id=user.id,
                actor_username=user.username,
                resource_type="permission",
                resource_id=code,
                result="failure",
                error_detail="无权限",
                permission_code=code,
            )
            raise HTTPException(status_code=403, detail="无权限")
        return user

    return _dep
