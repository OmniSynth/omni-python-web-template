"""租户域定时任务 API（仅手动触发，用于临时刷新数据）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from omni_api.api.deps import get_current_user
from omni_api.api.deps_tenant import current_tenant_id, require_tenant_permission
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.scheduled_job import TenantScheduledJobRecord
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
        await manager.trigger_job(code, tenant_id=tenant_id)
    except ValueError as exc:
        detail = str(exc)
        status = 404 if "不存在" in detail or "未知任务" in detail else 400
        raise HTTPException(status_code=status, detail=detail) from exc
    return {"status": "accepted", "message": TRIGGER_ACCEPTED_MSG}
