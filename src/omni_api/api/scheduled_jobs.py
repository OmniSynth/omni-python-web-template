"""定时任务管理 API（平台）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import require_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.scheduled_job import (
    ScheduledJobRecord,
    ScheduledJobStop,
    ScheduledJobTrigger,
    ScheduledJobUpdate,
)
from omni_api.schemas.tenant import PaginatedTenantOptions
from omni_api.services.scheduled_job_manager import ScheduledJobManager
from omni_api.services.scheduled_job_registry import TRIGGER_ACCEPTED_MSG

router = APIRouter(prefix="/api/v1/scheduled-jobs", tags=["scheduled-jobs"])


@router.get("", response_model=list[ScheduledJobRecord])
async def list_scheduled_jobs(
    sort_by: str | None = Query(default=None),
    sort_order: SortOrder | None = Query(default=None),
    _: UserRecord = Depends(require_permission("system.scheduled_job.list")),
) -> list[ScheduledJobRecord]:
    jobs = await ScheduledJobManager.get().list_jobs()
    if sort_by is None:
        return jobs
    reverse = sort_order == "desc"
    return sorted(jobs, key=lambda item: getattr(item, sort_by, ""), reverse=reverse)


@router.get("/tenant-options", response_model=PaginatedTenantOptions)
async def list_scheduled_job_tenant_options(
    q: str = Query(default="", max_length=64, description="租户名/手机号/机构名/统一社会信用代码"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: UserRecord = Depends(require_permission("system.scheduled_job.list")),
) -> PaginatedTenantOptions:
    return await TenantRepo(mysql_engine()).search_options(q=q, page=page, page_size=page_size)


@router.get("/{code}", response_model=ScheduledJobRecord)
async def get_scheduled_job(
    code: str,
    _: UserRecord = Depends(require_permission("system.scheduled_job.read")),
) -> ScheduledJobRecord:
    job = await ScheduledJobManager.get().get_job(code)
    if job is None:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return job


@router.put("/{code}", response_model=ScheduledJobRecord)
async def update_scheduled_job(
    code: str,
    body: ScheduledJobUpdate,
    _: UserRecord = Depends(require_permission("system.scheduled_job.update")),
) -> ScheduledJobRecord:
    try:
        job = await ScheduledJobManager.get().update_job(code, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if job is None:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return job


@router.post("/{code}/trigger", status_code=202)
async def trigger_scheduled_job(
    code: str,
    body: ScheduledJobTrigger = ScheduledJobTrigger(),
    _: UserRecord = Depends(require_permission("system.scheduled_job.trigger")),
) -> dict[str, str]:
    try:
        await ScheduledJobManager.get().trigger_job(code, tenant_id=body.tenant_id)
    except ValueError as exc:
        detail = str(exc)
        status = 404 if "不存在" in detail or "未知任务" in detail else 400
        raise HTTPException(status_code=status, detail=detail) from exc
    return {"status": "accepted", "message": TRIGGER_ACCEPTED_MSG}


@router.post("/{code}/start", response_model=ScheduledJobRecord)
async def start_scheduled_job(
    code: str,
    _: UserRecord = Depends(require_permission("system.scheduled_job.control")),
) -> ScheduledJobRecord:
    job = await ScheduledJobManager.get().start_job(code)
    if job is None:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return job


@router.post("/{code}/stop", response_model=ScheduledJobRecord)
async def stop_scheduled_job(
    code: str,
    body: ScheduledJobStop = ScheduledJobStop(),
    _: UserRecord = Depends(require_permission("system.scheduled_job.control")),
) -> ScheduledJobRecord:
    try:
        job = await ScheduledJobManager.get().stop_job(code, tenant_id=body.tenant_id)
    except ValueError as exc:
        detail = str(exc)
        status = 404 if "不存在" in detail else 400
        raise HTTPException(status_code=status, detail=detail) from exc
    if job is None:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return job
