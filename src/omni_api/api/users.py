"""用户管理 API。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import get_current_user, require_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.auth import (
    UserCreate,
    UserEnabledPatch,
    UserPasswordResetResponse,
    UserRecord,
    UserUpdate,
)
from omni_api.schemas.tenant import UserTenantConfigItem, UserTenantsUpdate
from omni_api.services.auth_service import hash_password
from omni_api.services.audit_service import AuditService
from omni_api.services.random_password import generate_random_password

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)],
)


def _repo() -> UserRepo:
    return UserRepo(mysql_engine())


def _tenants() -> TenantRepo:
    return TenantRepo(mysql_engine())


@router.get("", response_model=list[UserRecord])
async def list_users(
    sort_by: str | None = Query(default=None),
    sort_order: SortOrder | None = Query(default=None),
    _: object = Depends(require_permission("system.user.list")),
) -> list[UserRecord]:
    return await _repo().list_users(sort_by=sort_by, sort_order=sort_order)


@router.post("", response_model=UserRecord)
async def create_user(
    body: UserCreate,
    actor: UserRecord = Depends(require_permission("system.user.create")),
) -> UserRecord:
    existing = await _repo().get_by_username(body.username)
    if existing is not None:
        raise HTTPException(status_code=400, detail="用户名已存在")
    user = await _repo().create_user(
        body,
        hash_password(body.password),
        actor_id=actor.id,
    )
    await AuditService().record_operation(
        category="user",
        action="create",
        level="system",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(user.id),
        after=user,
        username=user.username,
    )
    return user


@router.get("/tenant-options", response_model=list[UserTenantConfigItem])
async def list_tenant_options(
    default_tenant_id: int | None = Query(default=None, gt=0),
    _: object = Depends(require_permission("system.user.create")),
) -> list[UserTenantConfigItem]:
    return await _tenants().list_tenant_config_template(default_tenant_id)


@router.get("/{user_id}", response_model=UserRecord)
async def get_user(
    user_id: int,
    _: object = Depends(require_permission("system.user.list")),
) -> UserRecord:
    user = await _repo().get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.put("/{user_id}", response_model=UserRecord)
async def update_user(
    user_id: int,
    body: UserUpdate,
    actor: UserRecord = Depends(require_permission("system.user.update")),
) -> UserRecord:
    if user_id == actor.id:
        if body.enabled is False:
            raise HTTPException(status_code=400, detail="不能禁用自己")
        if body.role_ids is not None and not body.role_ids:
            raise HTTPException(status_code=400, detail="不能移除自己的全部角色")
    before = await _repo().get_by_id(user_id)
    ph = hash_password(body.password) if body.password else None
    user = await _repo().update_user(user_id, body, password_hash=ph, actor_id=actor.id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    await AuditService().record_operation(
        category="user",
        action="update",
        level="system",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(user.id),
        before=before,
        after=user,
        username=user.username,
    )
    return user


@router.post("/{user_id}/reset-password", response_model=UserPasswordResetResponse)
async def reset_user_password(
    user_id: int,
    actor: UserRecord = Depends(require_permission("system.user.reset_password")),
) -> UserPasswordResetResponse:
    before = await _repo().get_by_id(user_id)
    if before is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    password = generate_random_password()
    user = await _repo().update_user(
        user_id,
        UserUpdate(),
        password_hash=hash_password(password),
        actor_id=actor.id,
    )
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    await AuditService().record_operation(
        category="user",
        action="reset_password",
        level="system",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(user.id),
        before=before,
        after=user,
        username=user.username,
    )
    return UserPasswordResetResponse(username=user.username, password=password)


@router.patch("/{user_id}/enabled", response_model=UserRecord)
async def patch_enabled(
    user_id: int,
    body: UserEnabledPatch,
    actor: UserRecord = Depends(require_permission("system.user.enable")),
) -> UserRecord:
    if user_id == actor.id and not body.enabled:
        raise HTTPException(status_code=400, detail="不能禁用自己")
    before = await _repo().get_by_id(user_id)
    user = await _repo().set_enabled(user_id, body.enabled, actor_id=actor.id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    await AuditService().record_operation(
        category="user",
        action="enable",
        level="system",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(user.id),
        before=before,
        after=user,
        username=user.username,
        meta_json={"enabled": body.enabled},
    )
    return user


@router.get("/{user_id}/tenants", response_model=list[UserTenantConfigItem])
async def list_user_tenants(
    user_id: int,
    _: object = Depends(require_permission("system.user.list")),
) -> list[UserTenantConfigItem]:
    user = await _repo().get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return await _tenants().list_user_tenant_config(user_id)


@router.put("/{user_id}/tenants", response_model=list[UserTenantConfigItem])
async def update_user_tenants(
    user_id: int,
    body: UserTenantsUpdate,
    actor: UserRecord = Depends(require_permission("system.user.update")),
) -> list[UserTenantConfigItem]:
    user = await _repo().get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user_id == actor.id:
        current_bindings = await _tenants().list_user_bindings(user_id)
        current_ids = {b.tenant_id for b in current_bindings}
        new_ids = {item.tenant_id for item in body.bindings}
        if not new_ids:
            raise HTTPException(status_code=400, detail="不能移除自己的全部租户绑定")
        if current_ids - new_ids:
            raise HTTPException(status_code=400, detail="不能解除自己的租户绑定")
    before = await _tenants().list_user_tenant_config(user_id)
    try:
        bindings = body.bindings
        after = await _tenants().set_user_tenant_bindings(user_id, bindings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await AuditService().record_operation(
        category="user",
        action="update_tenants",
        level="system",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(user_id),
        before=before,
        after=after,
        username=user.username,
    )
    return after
