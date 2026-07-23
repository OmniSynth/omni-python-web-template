"""租户域部门管理 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from omni_api.api.deps import get_current_user
from omni_api.api.deps_tenant import current_tenant_id, require_tenant_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.dept_repo import DeptRepo
from omni_api.schemas.tenant import DeptCreate, DeptRecord, DeptUpdate

router = APIRouter(
    prefix="/api/v1/tenant/depts",
    tags=["tenant-depts"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/tree", response_model=list[DeptRecord])
async def tenant_dept_tree(
    _: object = Depends(require_tenant_permission("tenant.dept.list")),
) -> list[DeptRecord]:
    return await DeptRepo(mysql_engine()).list_tree(current_tenant_id())


@router.post("", response_model=DeptRecord)
async def create_tenant_dept(
    body: DeptCreate,
    _: object = Depends(require_tenant_permission("tenant.dept.create")),
) -> DeptRecord:
    try:
        return await DeptRepo(mysql_engine()).create(current_tenant_id(), body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{dept_id}", response_model=DeptRecord)
async def update_tenant_dept(
    dept_id: int,
    body: DeptUpdate,
    _: object = Depends(require_tenant_permission("tenant.dept.update")),
) -> DeptRecord:
    try:
        dept = await DeptRepo(mysql_engine()).update(current_tenant_id(), dept_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if dept is None:
        raise HTTPException(status_code=404, detail="部门不存在")
    return dept


@router.delete("/{dept_id}", status_code=204)
async def delete_tenant_dept(
    dept_id: int,
    _: object = Depends(require_tenant_permission("tenant.dept.delete")),
) -> None:
    try:
        deleted = await DeptRepo(mysql_engine()).delete(current_tenant_id(), dept_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="部门不存在")
