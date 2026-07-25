"""认证 API。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from omni_api.api.deps import get_session_data
from omni_api.schemas.auth import (
    AuthUser,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    SwitchTenantRequest,
)
from omni_api.schemas.rbac import PermissionInfo
from omni_api.schemas.tenant import BoundTenantInfo
from omni_api.services.audit_service import AuditService
from omni_api.services.auth_service import AuthError
from omni_api.services.permission_service import PermissionService
from omni_api.services.register_service import RegisterService
from omni_api.services.session_service import SessionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


def _token(credentials: HTTPAuthorizationCredentials | None) -> str | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    return credentials.credentials.strip() or None


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    audit = AuditService()
    try:
        result = await SessionService().login(body)
    except AuthError as exc:
        await audit.record_operation(
            category="auth",
            action="login_failed",
            level="system",
            result="failure",
            error_detail=str(exc),
            username=body.username,
        )
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    await audit.record_operation(
        category="auth",
        action="login",
        level="system",
        actor_id=result.user.id,
        actor_username=result.user.username,
        resource_type="user",
        resource_id=str(result.user.id),
        result="success",
        username=result.user.username,
    )
    return result


@router.post("/register", response_model=RegisterResponse)
async def register(body: RegisterRequest) -> RegisterResponse:
    """公开注册：填写机构信息开通租户，系统生成密码；返回会话与一次性凭据。"""
    audit = AuditService()
    try:
        result = await RegisterService().register(body)
    except ValueError as exc:
        await audit.record_operation(
            category="auth",
            action="register_failed",
            level="system",
            result="failure",
            error_detail=str(exc),
            username=body.phone,
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except AuthError as exc:
        await audit.record_operation(
            category="auth",
            action="register_failed",
            level="system",
            result="failure",
            error_detail=str(exc),
            username=body.phone,
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await audit.record_operation(
        category="auth",
        action="register",
        level="system",
        actor_id=result.user.id,
        actor_username=result.user.username,
        resource_type="user",
        resource_id=str(result.user.id),
        result="success",
        username=result.user.username,
    )
    return result


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict[str, str]:
    token = _token(credentials)
    if token:
        await SessionService().logout(token)
    return {"status": "ok"}


@router.get("/me", response_model=AuthUser)
async def me(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    """当前用户；从 DB 重载当前租户角色/权限并写回 Redis 会话。"""
    token = _token(credentials)
    if not token:
        raise HTTPException(status_code=401, detail="未登录")
    try:
        return await SessionService().refresh(token)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.get("/nav", response_model=list[PermissionInfo])
async def nav_tree(_: dict = Depends(get_session_data)) -> list[PermissionInfo]:
    """侧栏导航树（目录 > 菜单），按当前租户下用户权限过滤。"""
    return await PermissionService().list_nav_tree()


@router.get("/tenants", response_model=list[BoundTenantInfo])
async def list_tenants(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> list[BoundTenantInfo]:
    token = _token(credentials)
    if not token:
        raise HTTPException(status_code=401, detail="未登录")
    try:
        return await SessionService().list_bound_tenants(token)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@router.post("/switch-tenant", response_model=AuthUser)
async def switch_tenant(
    body: SwitchTenantRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> AuthUser:
    token = _token(credentials)
    if not token:
        raise HTTPException(status_code=401, detail="未登录")
    try:
        return await SessionService().switch_tenant(token, body.tenant_id)
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
