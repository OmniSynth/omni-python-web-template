"""租户域定时任务 API（仅手动触发，用于临时刷新数据）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import get_current_user
from omni_api.api.deps_tenant import current_tenant_id, require_tenant_permission
from omni_api.data.mysql.actor import get_actor_id, get_actor_username
from omni_api.data.mysql.request_context import get_request_id
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.scheduled_job import (
    PaginatedScheduledJobRuns,
    ScheduledJobRunQuery,
    ScheduledJobRunRecord,
    ScheduledJobRunStatus,
    ScheduledJobTriggerType,
    TenantScheduledJobRecord,
)
from omni_api.schemas.utc_datetime import parse_api_utc_optional
from omni_api.services.scheduled_job_manager import ScheduledJobManager
from omni_api.services.scheduled_job_registry import TRIGGER_ACCEPTED_MSG, get_job_definition

router = APIRouter(
    prefix="/api/v1/tenant/scheduled-jobs",
    tags=["tenant-scheduled-jobs"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[TenantScheduledJobRecord])
async def list_tenant_scheduled_jobs(
    _: UserRecord = Depends(require_tenant_permission("tenant.scheduled_job.list")),
) -> list[TenantScheduledJobRecord]:
    tenant_id = current_tenant_id()
    return await ScheduledJobManager.get().list_tenant_jobs(tenant_id)


@router.get("/runs/{run_id}", response_model=ScheduledJobRunRecord)
async def get_tenant_scheduled_job_run(
    run_id: str,
    _: UserRecord = Depends(require_tenant_permission("tenant.scheduled_job.list")),
) -> ScheduledJobRunRecord:
    record = await ScheduledJobManager.get().get_run(run_id)
    if record is None or record.tenant_id != current_tenant_id():
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return record


@router.get("/{code}/runs", response_model=PaginatedScheduledJobRuns)
async def list_tenant_scheduled_job_runs(
    code: str,
    status: ScheduledJobRunStatus | None = Query(default=None),
    trigger_type: ScheduledJobTriggerType | None = Query(default=None),
    started_from: str | None = Query(default=None),
    started_to: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: UserRecord = Depends(require_tenant_permission("tenant.scheduled_job.list")),
) -> PaginatedScheduledJobRuns:
    definition = get_job_definition(code)
    if definition is None or definition.scope != "tenant":
        raise HTTPException(status_code=404, detail="定时任务不存在")
    try:
        from_dt = parse_api_utc_optional(started_from)
        to_dt = parse_api_utc_optional(started_to)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return await ScheduledJobManager.get().list_runs(
        ScheduledJobRunQuery(
            job_code=code,
            tenant_id=current_tenant_id(),
            status=status,
            trigger_type=trigger_type,
            started_from=from_dt,
            started_to=to_dt,
            page=page,
            page_size=page_size,
        )
    )


@router.post("/{code}/trigger", status_code=202)
async def trigger_tenant_scheduled_job(
    code: str,
    _: UserRecord = Depends(require_tenant_permission("tenant.scheduled_job.trigger")),
) -> dict[str, str]:
    definition = get_job_definition(code)
    if definition is None or definition.scope != "tenant":
        raise HTTPException(status_code=404, detail="定时任务不存在")
    tenant_id = current_tenant_id()
    manager = ScheduledJobManager.get()
    job = await manager.get_job(code)
    if job is None or not job.enabled:
        raise HTTPException(status_code=400, detail="任务已停止，无法手动执行")
    if not await manager.is_tenant_schedule_enabled(code, tenant_id):
        raise HTTPException(status_code=400, detail="任务已停止，无法手动执行")
    try:
        await manager.trigger_job(
            code,
            tenant_id=tenant_id,
            actor_user_id=get_actor_id(),
            actor_username=get_actor_username(),
            trigger_request_id=get_request_id(),
        )
    except ValueError as exc:
        detail = str(exc)
        status = 404 if "不存在" in detail or "未知任务" in detail else 400
        raise HTTPException(status_code=status, detail=detail) from exc
    return {"status": "accepted", "message": TRIGGER_ACCEPTED_MSG}
