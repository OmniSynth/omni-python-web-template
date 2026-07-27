"""审计日志查询与导出 API。"""

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import get_current_user, require_permission
from omni_api.schemas.audit_log import (
    AuditExportRequest,
    AuditExportResult,
    AuditLevel,
    OperationLogQuery,
    OperationLogRecord,
    PaginatedOperationLogs,
    PaginatedRequestLogs,
    PaginatedSlowSqlLogs,
    RequestLogQuery,
    RequestLogRecord,
    SlowSqlLogQuery,
    SlowSqlLogRecord,
    SqlSeverity,
    SqlTier,
)
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.scheduled_job import (
    PaginatedScheduledJobRuns,
    ScheduledJobRunQuery,
    ScheduledJobRunRecord,
    ScheduledJobRunStatus,
    ScheduledJobTriggerType,
)
from omni_api.schemas.utc_datetime import parse_api_utc_optional
from omni_api.services.audit_service import AuditService
from omni_api.services.scheduled_job_manager import ScheduledJobManager

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/audit",
    tags=["audit"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/requests", response_model=PaginatedRequestLogs)
async def list_request_logs(
    occurred_from: str | None = Query(None, alias="from"),
    occurred_to: str | None = Query(None, alias="to"),
    level: AuditLevel | None = None,
    user_id: int | None = None,
    status_code: int | None = None,
    request_id: str | None = None,
    keyword: str | None = None,
    sort_by: str | None = None,
    sort_order: SortOrder | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: object = Depends(require_permission("system.audit.read")),
) -> PaginatedRequestLogs:
    q = RequestLogQuery(
        occurred_from=parse_api_utc_optional(occurred_from),
        occurred_to=parse_api_utc_optional(occurred_to),
        level=level,
        user_id=user_id,
        status_code=status_code,
        request_id=request_id,
        keyword=keyword,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return await AuditService().list_requests(q)


@router.get("/requests/{log_id}", response_model=RequestLogRecord)
async def get_request_log(
    log_id: int,
    _: object = Depends(require_permission("system.audit.read")),
) -> RequestLogRecord:
    rec = await AuditService().get_request(log_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="请求日志不存在")
    return rec


@router.get("/operations", response_model=PaginatedOperationLogs)
async def list_operation_logs(
    occurred_from: str | None = Query(None, alias="from"),
    occurred_to: str | None = Query(None, alias="to"),
    level: AuditLevel | None = None,
    actor_id: int | None = None,
    category: str | None = None,
    action: str | None = None,
    request_id: str | None = None,
    keyword: str | None = None,
    sort_by: str | None = None,
    sort_order: SortOrder | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: object = Depends(require_permission("system.audit.read")),
) -> PaginatedOperationLogs:
    q = OperationLogQuery(
        occurred_from=parse_api_utc_optional(occurred_from),
        occurred_to=parse_api_utc_optional(occurred_to),
        level=level,
        actor_id=actor_id,
        category=category,
        action=action,
        request_id=request_id,
        keyword=keyword,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return await AuditService().list_operations(q)


@router.get("/operations/{log_id}", response_model=OperationLogRecord)
async def get_operation_log(
    log_id: int,
    _: object = Depends(require_permission("system.audit.read")),
) -> OperationLogRecord:
    rec = await AuditService().get_operation(log_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="操作日志不存在")
    return rec


@router.get("/slow-sql", response_model=PaginatedSlowSqlLogs)
async def list_slow_sql_logs(
    occurred_from: str | None = Query(None, alias="from"),
    occurred_to: str | None = Query(None, alias="to"),
    tier: SqlTier | None = None,
    severity: SqlSeverity | None = None,
    request_id: str | None = None,
    keyword: str | None = None,
    sort_by: str | None = None,
    sort_order: SortOrder | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: object = Depends(require_permission("system.audit.read")),
) -> PaginatedSlowSqlLogs:
    q = SlowSqlLogQuery(
        occurred_from=parse_api_utc_optional(occurred_from),
        occurred_to=parse_api_utc_optional(occurred_to),
        tier=tier,
        severity=severity,
        request_id=request_id,
        keyword=keyword,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return await AuditService().list_slow_sql(q)


@router.get("/slow-sql/{log_id}", response_model=SlowSqlLogRecord)
async def get_slow_sql_log(
    log_id: int,
    _: object = Depends(require_permission("system.audit.read")),
) -> SlowSqlLogRecord:
    rec = await AuditService().get_slow_sql(log_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="慢 SQL 日志不存在")
    return rec


@router.get("/scheduled-job-runs", response_model=PaginatedScheduledJobRuns)
async def list_scheduled_job_runs(
    occurred_from: str | None = Query(None, alias="from"),
    occurred_to: str | None = Query(None, alias="to"),
    job_code: str | None = None,
    tenant_id: int | None = Query(default=None, gt=0),
    status: ScheduledJobRunStatus | None = None,
    trigger_type: ScheduledJobTriggerType | None = None,
    request_id: str | None = None,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: object = Depends(require_permission("system.audit.read")),
) -> PaginatedScheduledJobRuns:
    """审计中心：全量任务执行记录。"""
    return await ScheduledJobManager.get().list_runs(
        ScheduledJobRunQuery(
            job_code=job_code,
            tenant_id=tenant_id,
            status=status,
            trigger_type=trigger_type,
            trigger_request_id=request_id,
            keyword=keyword,
            started_from=parse_api_utc_optional(occurred_from),
            started_to=parse_api_utc_optional(occurred_to),
            page=page,
            page_size=page_size,
        )
    )


@router.get("/scheduled-job-runs/{run_id}", response_model=ScheduledJobRunRecord)
async def get_scheduled_job_run(
    run_id: str,
    _: object = Depends(require_permission("system.audit.read")),
) -> ScheduledJobRunRecord:
    record = await ScheduledJobManager.get().get_run(run_id)
    if record is None:
        raise HTTPException(status_code=404, detail="执行记录不存在")
    return record


@router.post("/export", response_model=AuditExportResult)
async def export_audit_logs(
    body: AuditExportRequest,
    actor: UserRecord = Depends(require_permission("system.audit.export")),
) -> AuditExportResult:
    svc = AuditService()
    result = await svc.export_and_purge(body)
    await svc.record_operation(
        category="audit",
        action="export",
        level="system",
        actor_id=actor.id,
        actor_username=actor.username,
        result="success",
        after=result.model_dump(),
    )
    return result
