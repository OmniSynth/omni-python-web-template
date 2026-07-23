"""租户域用户管理 API。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import get_current_user
from omni_api.api.deps_tenant import current_tenant_id, require_tenant_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.services.data_scope_guard import DataScopeGuard
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.auth import (
    TenantUserCreate,
    TenantUserUpdate,
    UserCreate,
    UserCreateWithPassword,
    UserEnabledPatch,
    UserRecord,
)
from omni_api.schemas.tenant import MEMBERSHIP_DEPARTED
from omni_api.services.audit_service import AuditService
from omni_api.services.auth_service import hash_password
from omni_api.services.random_password import generate_random_password
from omni_api.services.tenant_user_offboard import TenantUserOffboardService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/tenant/users",
    tags=["tenant-users"],
    dependencies=[Depends(get_current_user)],
)


def _repo() -> UserRepo:
    return UserRepo(mysql_engine())


async def _require_tenant_member(user_id: int, tenant_id: int) -> UserRecord:
    repo = _repo()
    if not await repo.is_user_in_tenant(user_id, tenant_id):
        raise HTTPException(status_code=404, detail="用户不存在")
    user = await repo.get_by_id(user_id, tenant_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    guard = DataScopeGuard(mysql_engine(), tenant_id=tenant_id)
    await guard.assert_access(
        dept_id=user.dept_id,
        created_by=user.created_by,
        subject_user_id=user.id,
    )
    return user


def _reject_departed(user: UserRecord) -> None:
    if user.membership_status == MEMBERSHIP_DEPARTED:
        raise HTTPException(status_code=400, detail="用户已离职")


@router.get("", response_model=list[UserRecord])
async def list_tenant_users(
    sort_by: str | None = Query(default=None),
    sort_order: SortOrder | None = Query(default=None),
    _: object = Depends(require_tenant_permission("tenant.user.list")),
) -> list[UserRecord]:
    tenant_id = current_tenant_id()
    return await _repo().list_users_by_tenant(
        tenant_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("", response_model=UserCreateWithPassword)
async def create_tenant_user(
    body: TenantUserCreate,
    actor: UserRecord = Depends(require_tenant_permission("tenant.user.create")),
) -> UserCreateWithPassword:
    tenant_id = current_tenant_id()
    repo = _repo()
    existing = await repo.get_by_username(body.username)
    if existing is not None:
        user, _ = existing
        if await repo.is_user_active_in_tenant(user.id, tenant_id):
            raise HTTPException(status_code=400, detail="用户名已存在")
        try:
            bound = await repo.bind_user_to_tenant(
                user.id,
                tenant_id,
                dept_id=body.dept_id,
                role_ids=body.role_ids,
                data_scope=body.data_scope,
                custom_scopes=body.custom_scopes,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        await AuditService().record_operation(
            category="user",
            action="bind",
            level="business",
            actor_id=actor.id,
            actor_username=actor.username,
            resource_type="user",
            resource_id=str(bound.id),
            after=bound,
            username=bound.username,
            meta_json={"tenant_id": tenant_id, "via": "tenant_user_create"},
        )
        return UserCreateWithPassword(user=bound, password=None, bound_existing=True)

    password = body.password or generate_random_password()
    try:
        user = await repo.create_user(
            UserCreate(
                username=body.username,
                password=password,
                display_name=body.display_name,
                role_ids=body.role_ids,
                dept_id=body.dept_id,
                data_scope=body.data_scope,
                custom_scopes=body.custom_scopes,
            ),
            hash_password(password),
            actor_id=actor.id,
            tenant_id=tenant_id,
            dept_id=body.dept_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await AuditService().record_operation(
        category="user",
        action="create",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(user.id),
        after=user,
        username=user.username,
    )
    return UserCreateWithPassword(user=user, password=password, bound_existing=False)


@router.get("/{user_id}", response_model=UserRecord)
async def get_tenant_user(
    user_id: int,
    _: object = Depends(require_tenant_permission("tenant.user.list")),
) -> UserRecord:
    tenant_id = current_tenant_id()
    user = await _require_tenant_member(user_id, tenant_id)
    return user


@router.put("/{user_id}", response_model=UserRecord)
async def update_tenant_user(
    user_id: int,
    body: TenantUserUpdate,
    actor: UserRecord = Depends(require_tenant_permission("tenant.user.update")),
) -> UserRecord:
    tenant_id = current_tenant_id()
    member = await _require_tenant_member(user_id, tenant_id)
    _reject_departed(member)
    if user_id == actor.id:
        raise HTTPException(
            status_code=403,
            detail="请使用个人中心修改个人信息；角色与权限需由其他管理员维护",
        )
    before = await _repo().get_by_id(user_id, tenant_id)
    user = await _repo().update_tenant_member(
        user_id,
        body,
        actor_id=actor.id,
        tenant_id=tenant_id,
    )
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    await AuditService().record_operation(
        category="user",
        action="update",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(user.id),
        before=before,
        after=user,
        username=user.username,
    )
    return user


@router.patch("/{user_id}/enabled", response_model=UserRecord)
async def patch_tenant_user_enabled(
    user_id: int,
    body: UserEnabledPatch,
    actor: UserRecord = Depends(require_tenant_permission("tenant.user.enable")),
) -> UserRecord:
    tenant_id = current_tenant_id()
    member = await _require_tenant_member(user_id, tenant_id)
    _reject_departed(member)
    if user_id == actor.id and not body.enabled:
        raise HTTPException(status_code=400, detail="不能禁用自己")
    before = await _repo().get_by_id(user_id, tenant_id)
    user = await _repo().set_enabled(user_id, body.enabled, actor_id=actor.id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    user = await _repo().get_by_id(user_id, tenant_id)
    assert user is not None
    await AuditService().record_operation(
        category="user",
        action="enable",
        level="business",
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


@router.post("/{user_id}/offboard", response_model=UserRecord)
async def offboard_tenant_user(
    user_id: int,
    actor: UserRecord = Depends(require_tenant_permission("tenant.user.offboard")),
) -> UserRecord:
    tenant_id = current_tenant_id()
    try:
        before, after = await TenantUserOffboardService(mysql_engine()).offboard(
            tenant_id,
            user_id,
            actor_id=actor.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await AuditService().record_operation(
        category="user",
        action="offboard",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="user",
        resource_id=str(after.id),
        before=before,
        after=after,
        username=after.username,
        meta_json={"tenant_id": tenant_id},
    )
    return after
