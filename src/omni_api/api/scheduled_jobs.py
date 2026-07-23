"""定时任务管理 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import require_permission
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.scheduled_job import ScheduledJobRecord, ScheduledJobUpdate
from omni_api.services.scheduled_job_manager import ScheduledJobManager

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
    key = sort_by
    return sorted(jobs, key=lambda item: getattr(item, key, ""), reverse=reverse)


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
    _: UserRecord = Depends(require_permission("system.scheduled_job.trigger")),
) -> dict[str, str]:
    try:
        await ScheduledJobManager.get().trigger_job(code)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    message = "同步任务已开始执行，请稍后刷新查看结果"
    return {"status": "accepted", "message": message}


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
    _: UserRecord = Depends(require_permission("system.scheduled_job.control")),
) -> ScheduledJobRecord:
    job = await ScheduledJobManager.get().stop_job(code)
    if job is None:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return job
