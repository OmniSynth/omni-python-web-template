"""租户域角色与权限 API。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import get_current_user
from omni_api.api.deps_tenant import current_tenant_id, require_tenant_permission
from omni_api.auth.permission_catalog_scope import invalid_codes_for_role_type
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.rbac import (
    PermissionInfo,
    RoleCreate,
    RolePermissionsPatch,
    RoleRecord,
    RoleUpdate,
)
from omni_api.schemas.sys_role_type import ROLE_TYPE_TENANT
from omni_api.services.audit_service import AuditService
from omni_api.services.permission_service import PermissionService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/tenant/roles",
    tags=["tenant-roles"],
    dependencies=[Depends(get_current_user)],
)


def _repo(tenant_id: int) -> RoleRepo:
    return RoleRepo(mysql_engine(), tenant_id=tenant_id)


def _reject_if_system_managed(role: RoleRecord, *, for_permissions: bool = False) -> None:
    if not role.system_managed:
        return
    detail = (
        "系统预置角色权限不可修改"
        if for_permissions
        else "系统预置角色不可编辑"
    )
    raise HTTPException(status_code=400, detail=detail)


@router.get("/permissions/tree", response_model=list[PermissionInfo])
async def list_tenant_permission_tree(
    _: object = Depends(require_tenant_permission("tenant.role.list")),
) -> list[PermissionInfo]:
    return await PermissionService(tenant_id=current_tenant_id()).list_tenant_permission_tree()


@router.get("", response_model=list[RoleRecord])
async def list_tenant_roles(
    sort_by: str | None = Query(default=None),
    sort_order: SortOrder | None = Query(default=None),
    _: object = Depends(require_tenant_permission("tenant.role.list")),
) -> list[RoleRecord]:
    tenant_id = current_tenant_id()
    # 角色为租户级配置资源，持有 tenant.role.list 即可查看本租户全部角色
    return await _repo(tenant_id).list_all_roles(
        tenant_id,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("", response_model=RoleRecord)
async def create_tenant_role(
    body: RoleCreate,
    _: object = Depends(require_tenant_permission("tenant.role.create")),
) -> RoleRecord:
    tenant_id = current_tenant_id()
    existing = await _repo(tenant_id).get_by_code(body.code, tenant_id)
    if existing is not None:
        raise HTTPException(status_code=400, detail="角色 code 已存在")
    return await _repo(tenant_id).create_role(body, tenant_id, system_managed=False)


@router.get("/{role_id}", response_model=RoleRecord)
async def get_tenant_role(
    role_id: int,
    _: object = Depends(require_tenant_permission("tenant.role.list")),
) -> RoleRecord:
    tenant_id = current_tenant_id()
    role = await _repo(tenant_id).get_by_id(role_id, tenant_id)
    if role is None:
        raise HTTPException(status_code=404, detail="角色不存在")
    return role


@router.put("/{role_id}", response_model=RoleRecord)
async def update_tenant_role(
    role_id: int,
    body: RoleUpdate,
    _: object = Depends(require_tenant_permission("tenant.role.update")),
) -> RoleRecord:
    tenant_id = current_tenant_id()
    role = await _repo(tenant_id).get_by_id(role_id, tenant_id)
    if role is None:
        raise HTTPException(status_code=404, detail="角色不存在")
    _reject_if_system_managed(role)
    updated = await _repo(tenant_id).update_role(role_id, body, tenant_id)
    assert updated is not None
    return updated


@router.put("/{role_id}/permissions", response_model=RoleRecord)
async def set_tenant_role_permissions(
    role_id: int,
    body: RolePermissionsPatch,
    _: object = Depends(require_tenant_permission("tenant.role.assign_permission")),
) -> RoleRecord:
    tenant_id = current_tenant_id()
    role = await _repo(tenant_id).get_by_id(role_id, tenant_id)
    if role is None:
        raise HTTPException(status_code=404, detail="角色不存在")
    _reject_if_system_managed(role, for_permissions=True)
    invalid = [c for c in body.permissions if c.startswith("system.")]
    if invalid:
        raise HTTPException(status_code=400, detail="租户角色不可分配平台 system.* 权限")
    cross_catalog = invalid_codes_for_role_type(ROLE_TYPE_TENANT, body.permissions)
    if cross_catalog:
        raise HTTPException(
            status_code=400,
            detail="权限与角色类型不匹配：租户角色仅可绑定训练/设置/订单目录",
        )
    updated = await _repo(tenant_id).set_role_permissions(role_id, body.permissions, tenant_id)
    assert updated is not None
    await AuditService().record_operation(
        category="role",
        action="assign_permission",
        level="business",
        resource_type="role",
        resource_id=str(updated.id),
        after={"permissions": updated.permissions},
        code=updated.code,
    )
    return updated
