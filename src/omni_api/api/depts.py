"""部门管理 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import require_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.dept_repo import DeptRepo
from omni_api.data.mysql.tenant_context import get_tenant_id
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.tenant import DeptCreate, DeptRecord, DeptUpdate

router = APIRouter(prefix="/api/v1/depts", tags=["depts"])


def _resolve_tenant_id(tenant_id: int | None) -> int:
    if tenant_id is not None:
        return tenant_id
    tid = get_tenant_id()
    if tid is None:
        raise HTTPException(status_code=403, detail="请先选择租户")
    return tid


@router.get("/tree", response_model=list[DeptRecord])
async def dept_tree(
    tenant_id: int | None = Query(default=None, gt=0),
    _: UserRecord = Depends(require_permission("system.dept.list")),
) -> list[DeptRecord]:
    tid = _resolve_tenant_id(tenant_id)
    return await DeptRepo(mysql_engine()).list_tree(tid)


@router.get("/tree-for-user", response_model=list[DeptRecord])
async def dept_tree_for_user(
    tenant_id: int = Query(gt=0),
    _: UserRecord = Depends(require_permission("system.user.update")),
) -> list[DeptRecord]:
    return await DeptRepo(mysql_engine()).list_tree(tenant_id)


@router.post("", response_model=DeptRecord)
async def create_dept(
    body: DeptCreate,
    _: UserRecord = Depends(require_permission("system.dept.create")),
) -> DeptRecord:
    try:
        return await DeptRepo(mysql_engine()).create(_resolve_tenant_id(None), body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{dept_id}", response_model=DeptRecord)
async def update_dept(
    dept_id: int,
    body: DeptUpdate,
    _: UserRecord = Depends(require_permission("system.dept.update")),
) -> DeptRecord:
    try:
        dept = await DeptRepo(mysql_engine()).update(
            _resolve_tenant_id(None), dept_id, body
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if dept is None:
        raise HTTPException(status_code=404, detail="部门不存在")
    return dept


@router.delete("/{dept_id}", status_code=204)
async def delete_dept(
    dept_id: int,
    _: UserRecord = Depends(require_permission("system.dept.delete")),
) -> None:
    try:
        deleted = await DeptRepo(mysql_engine()).delete(
            _resolve_tenant_id(None), dept_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="部门不存在")
