"""权限管理 API。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from omni_api.api.deps import get_current_user, require_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.permission_repo import PermissionRepo
from omni_api.schemas.rbac import (
    PermissionBindingsPatch,
    PermissionCreate,
    PermissionInfo,
    PermissionRecord,
    PermissionUpdate,
)
from omni_api.services.audit_service import AuditService
from omni_api.services.permission_service import PermissionService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/permissions",
    tags=["permissions"],
    dependencies=[Depends(get_current_user)],
)


def _repo() -> PermissionRepo:
    return PermissionRepo(mysql_engine())


def _to_info(raw: dict) -> PermissionInfo:
    return PermissionInfo(
        id=raw.get("id"),
        code=raw["code"],
        name=raw["name"],
        kind=raw["kind"],
        parent_id=raw.get("parent_id"),
        sort_order=raw.get("sort_order", 0),
        enabled=raw.get("enabled", True),
        route_path=raw.get("route_path"),
        component_key=raw.get("component_key"),
        api_codes=raw.get("api_codes", []),
        children=[_to_info(c) for c in raw.get("children", [])],
    )


@router.get("", response_model=list[PermissionRecord])
async def list_permissions(
    _: object = Depends(require_permission("system.permission.list")),
) -> list[PermissionRecord]:
    return await _repo().list_all()


@router.get("/tree", response_model=list[PermissionInfo])
async def permission_tree(
    _: object = Depends(require_permission("system.permission.list")),
) -> list[PermissionInfo]:
    tree = await _repo().build_tree(assignable_only=False, enabled_only=False)
    return [_to_info(n) for n in tree]


@router.post("", response_model=PermissionRecord)
async def create_permission(
    body: PermissionCreate,
    _: object = Depends(require_permission("system.permission.create")),
) -> PermissionRecord:
    try:
        record = await _repo().create(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    PermissionService.invalidate_cache()
    await AuditService().record_operation(
        category="permission",
        action="create",
        level="system",
        resource_type="permission",
        resource_id=str(record.id),
        after=record,
        code=record.code,
    )
    return record


@router.get("/{perm_id}", response_model=PermissionRecord)
async def get_permission(
    perm_id: int,
    _: object = Depends(require_permission("system.permission.list")),
) -> PermissionRecord:
    record = await _repo().get_by_id(perm_id)
    if record is None:
        raise HTTPException(status_code=404, detail="权限不存在")
    return record


@router.put("/{perm_id}", response_model=PermissionRecord)
async def update_permission(
    perm_id: int,
    body: PermissionUpdate,
    _: object = Depends(require_permission("system.permission.update")),
) -> PermissionRecord:
    before = await _repo().get_by_id(perm_id)
    if before is None:
        raise HTTPException(status_code=404, detail="权限不存在")
    try:
        updated = await _repo().update(perm_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    assert updated is not None
    PermissionService.invalidate_cache()
    await AuditService().record_operation(
        category="permission",
        action="update",
        level="system",
        resource_type="permission",
        resource_id=str(updated.id),
        before=before,
        after=updated,
        code=updated.code,
    )
    return updated


@router.delete("/{perm_id}")
async def delete_permission(
    perm_id: int,
    _: object = Depends(require_permission("system.permission.delete")),
) -> dict[str, str]:
    before = await _repo().get_by_id(perm_id)
    if before is None:
        raise HTTPException(status_code=404, detail="权限不存在")
    try:
        await _repo().delete(perm_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    PermissionService.invalidate_cache()
    await AuditService().record_operation(
        category="permission",
        action="delete",
        level="system",
        resource_type="permission",
        resource_id=str(perm_id),
        before=before,
        code=before.code,
    )
    return {"status": "ok"}


@router.get("/{perm_id}/bindings", response_model=list[str])
async def get_bindings(
    perm_id: int,
    _: object = Depends(require_permission("system.permission.list")),
) -> list[str]:
    record = await _repo().get_by_id(perm_id)
    if record is None:
        raise HTTPException(status_code=404, detail="权限不存在")
    return await _repo().get_api_bindings(perm_id)


@router.put("/{perm_id}/bindings", response_model=PermissionRecord)
async def set_bindings(
    perm_id: int,
    body: PermissionBindingsPatch,
    _: object = Depends(require_permission("system.permission.update")),
) -> PermissionRecord:
    before = await _repo().get_by_id(perm_id)
    if before is None:
        raise HTTPException(status_code=404, detail="权限不存在")
    before_bindings = await _repo().get_api_bindings(perm_id)
    try:
        updated = await _repo().set_api_bindings_by_codes(perm_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    assert updated is not None
    PermissionService.invalidate_cache()
    await AuditService().record_operation(
        category="permission",
        action="update_bindings",
        level="system",
        resource_type="permission",
        resource_id=str(updated.id),
        before={"api_codes": before_bindings},
        after={"api_codes": body.api_codes},
        code=updated.code,
    )
    return updated
