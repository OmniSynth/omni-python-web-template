"""平台系统角色与权限 API。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import get_current_user, require_permission
from omni_api.auth.permissions import ROLE_ADMIN
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.sys_role_repo import SysRoleRepo
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.rbac import (
    PermissionInfo,
    RoleCreate,
    RolePermissionsPatch,
    RoleRecord,
    RoleUpdate,
)
from omni_api.auth.permission_catalog_scope import invalid_codes_for_role_type
from omni_api.schemas.sys_role_type import ROLE_TYPE_SYSTEM, ROLE_TYPE_TENANT, RoleType
from omni_api.services.audit_service import AuditService
from omni_api.services.permission_service import PermissionService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/roles",
    tags=["roles"],
    dependencies=[Depends(get_current_user)],
)


def _repo() -> SysRoleRepo:
    return SysRoleRepo(mysql_engine())


def _reject_tenant_permissions(permissions: list[str]) -> None:
    invalid = [c for c in permissions if c.startswith("tenant.")]
    if invalid:
        raise HTTPException(status_code=400, detail="平台系统角色不可分配 tenant.* 权限")


def _reject_cross_catalog_permissions(role_type: str, permissions: list[str]) -> None:
    scope = ROLE_TYPE_SYSTEM if role_type == ROLE_TYPE_SYSTEM else ROLE_TYPE_TENANT
    invalid = invalid_codes_for_role_type(scope, permissions)
    if invalid:
        raise HTTPException(
            status_code=400,
            detail="权限与角色类型不匹配：系统角色仅可绑定系统/平台管理目录，租户角色仅可绑定租户业务目录",
        )


@router.get("/permissions", response_model=list[PermissionInfo])
async def list_permissions(
    role_type: RoleType | None = Query(default=ROLE_TYPE_SYSTEM),
    _: object = Depends(require_permission("system.role.list")),
) -> list[PermissionInfo]:
    if role_type == ROLE_TYPE_TENANT:
        return await PermissionService().list_tenant_permission_tree()
    return await PermissionService().list_system_permission_tree()


@router.get("/tenant-bindable", response_model=list[RoleRecord])
async def list_tenant_bindable_roles(
    _: object = Depends(require_permission("system.role.list")),
) -> list[RoleRecord]:
    """机构/租户创建时可绑定的租户类型平台角色。"""
    return await _repo().list_tenant_bindable_roles()


@router.get("", response_model=list[RoleRecord])
async def list_roles(
    sort_by: str | None = Query(default=None),
    sort_order: SortOrder | None = Query(default=None),
    _: object = Depends(require_permission("system.role.list")),
) -> list[RoleRecord]:
    return await _repo().list_roles(sort_by=sort_by, sort_order=sort_order)


@router.post("", response_model=RoleRecord)
async def create_role(
    body: RoleCreate,
    _: object = Depends(require_permission("system.role.create")),
) -> RoleRecord:
    existing = await _repo().get_by_code(body.code)
    if existing is not None:
        raise HTTPException(status_code=400, detail="角色 code 已存在")
    role = await _repo().create_role(body)
    await AuditService().record_operation(
        category="role",
        action="create",
        level="system",
        resource_type="role",
        resource_id=str(role.id),
        after=role,
        code=role.code,
    )
    return role


@router.get("/{role_id}", response_model=RoleRecord)
async def get_role(
    role_id: int,
    _: object = Depends(require_permission("system.role.list")),
) -> RoleRecord:
    role = await _repo().get_by_id(role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="角色不存在")
    return role


@router.put("/{role_id}", response_model=RoleRecord)
async def update_role(
    role_id: int,
    body: RoleUpdate,
    _: object = Depends(require_permission("system.role.update")),
) -> RoleRecord:
    role = await _repo().get_by_id(role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="角色不存在")
    if role.code == ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="内置管理员角色不可编辑")
    updated = await _repo().update_role(role_id, body)
    assert updated is not None
    return updated


@router.put("/{role_id}/permissions", response_model=RoleRecord)
async def set_role_permissions(
    role_id: int,
    body: RolePermissionsPatch,
    _: object = Depends(require_permission("system.role.assign_permission")),
) -> RoleRecord:
    role = await _repo().get_by_id(role_id)
    if role is None:
        raise HTTPException(status_code=404, detail="角色不存在")
    if role.code == ROLE_ADMIN:
        raise HTTPException(status_code=400, detail="内置管理员角色权限不可修改")
    if role.role_type == ROLE_TYPE_SYSTEM:
        _reject_tenant_permissions(body.permissions)
    else:
        invalid = [c for c in body.permissions if c.startswith("system.")]
        if invalid:
            raise HTTPException(status_code=400, detail="租户类型平台角色不可分配 system.* 权限")
    _reject_cross_catalog_permissions(role.role_type, body.permissions)
    before_perms = list(role.permissions)
    updated = await _repo().set_role_permissions(role_id, body.permissions)
    assert updated is not None
    if updated.role_type == ROLE_TYPE_TENANT:
        await RoleRepo(mysql_engine()).propagate_sys_tenant_role_permissions(updated.code)
    await AuditService().record_operation(
        category="role",
        action="assign_permission",
        level="system",
        resource_type="role",
        resource_id=str(updated.id),
        before={"permissions": before_perms},
        after={"permissions": updated.permissions},
        code=updated.code,
    )
    return updated
