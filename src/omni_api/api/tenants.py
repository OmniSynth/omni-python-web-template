"""租户管理 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import require_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.tenant_system_role_repo import TenantSystemRoleRepo
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.tenant import (
    TenantAdminUserOption,
    TenantCreate,
    TenantCreateResult,
    TenantRecord,
    TenantSystemRolesRecord,
    TenantSystemRolesUpdate,
    TenantUpdate,
)
from omni_api.services.tenant_admin import TenantAdminService
from omni_api.services.tenant_onboarding import TenantOnboardingService

router = APIRouter(prefix="/api/v1/tenants", tags=["tenants"])


@router.get("", response_model=list[TenantRecord])
async def list_tenants(
    sort_by: str | None = Query(default=None),
    sort_order: SortOrder | None = Query(default=None),
    _: UserRecord = Depends(require_permission("system.tenant.list")),
) -> list[TenantRecord]:
    return await TenantRepo(mysql_engine()).list_tenants(
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get("/admin-user-options", response_model=list[TenantAdminUserOption])
async def list_admin_user_options(
    tenant_id: int | None = Query(default=None, gt=0),
    _: UserRecord = Depends(require_permission("system.tenant.list")),
) -> list[TenantAdminUserOption]:
    return await TenantRepo(mysql_engine()).list_admin_user_options(tenant_id)


@router.post("", response_model=TenantCreateResult)
async def create_tenant(
    body: TenantCreate,
    _: UserRecord = Depends(require_permission("system.tenant.create")),
) -> TenantCreateResult:
    try:
        return await TenantOnboardingService(mysql_engine()).create_with_result(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{tenant_id}", response_model=TenantRecord)
async def update_tenant(
    tenant_id: int,
    body: TenantUpdate,
    _: UserRecord = Depends(require_permission("system.tenant.update")),
) -> TenantRecord:
    engine = mysql_engine()
    repo = TenantRepo(engine)
    try:
        tenant = await repo.update(tenant_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if tenant is None:
        raise HTTPException(status_code=404, detail="租户不存在")
    if body.admin_user_id is not None:
        try:
            await TenantAdminService(engine).bind_admin(tenant_id, body.admin_user_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        tenant = await repo.get_by_id(tenant_id)
        assert tenant is not None
    return tenant


@router.get("/{tenant_id}/system-roles", response_model=TenantSystemRolesRecord)
async def get_tenant_system_roles(
    tenant_id: int,
    _: UserRecord = Depends(require_permission("system.tenant.bind_role")),
) -> TenantSystemRolesRecord:
    tenant = await TenantRepo(mysql_engine()).get_by_id(tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="租户不存在")
    codes = await TenantSystemRoleRepo(mysql_engine()).list_role_codes(tenant_id)
    return TenantSystemRolesRecord(tenant_id=tenant_id, role_codes=codes)


@router.put("/{tenant_id}/system-roles", response_model=TenantSystemRolesRecord)
async def set_tenant_system_roles(
    tenant_id: int,
    body: TenantSystemRolesUpdate,
    _: UserRecord = Depends(require_permission("system.tenant.bind_role")),
) -> TenantSystemRolesRecord:
    engine = mysql_engine()
    tenant = await TenantRepo(engine).get_by_id(tenant_id)
    if tenant is None:
        raise HTTPException(status_code=404, detail="租户不存在")
    try:
        system_role_repo = TenantSystemRoleRepo(engine)
        old_codes = await system_role_repo.list_role_codes(tenant_id)
        codes = await system_role_repo.set_bindings(tenant_id, body.role_codes)
        await RoleRepo(engine, tenant_id=tenant_id).sync_tenant_system_role_permissions(
            tenant_id, previous_bindings=old_codes
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TenantSystemRolesRecord(tenant_id=tenant_id, role_codes=codes)
