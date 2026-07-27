"""定时任务单次执行与执行记录写入。"""

from __future__ import annotations

import logging
import socket
from typing import Any, Mapping

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.scheduled_job_repo import ScheduledJobRepo
from omni_api.data.mysql.scheduled_job_run_repo import ScheduledJobRunRepo
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.schemas.scheduled_job import (
    JobRunOutcome,
    ScheduledJobRunStatus,
    ScheduledJobScope,
    ScheduledJobTriggerType,
)
from omni_api.services.scheduled_job_registry import get_job_definition

logger = logging.getLogger(__name__)


def normalize_outcome(detail: str | JobRunOutcome | None, *, manual: bool) -> JobRunOutcome:
    if isinstance(detail, JobRunOutcome):
        return detail
    if detail:
        return JobRunOutcome(status="success", summary=detail)
    return JobRunOutcome(
        status="success",
        summary="手动触发成功" if manual else "执行成功",
    )


def as_run_status(status: str) -> ScheduledJobRunStatus:
    if status in ("success", "failure", "partial", "skipped", "running"):
        return status  # type: ignore[return-value]
    return "failure"


async def tenant_skip_reason(tenant_id: int | None) -> tuple[str, str] | None:
    if tenant_id is None:
        return None
    tenants = TenantRepo(mysql_engine())
    tenant = await tenants.get_by_id(tenant_id)
    if tenant is None:
        return ("tenant_missing", "租户不存在")
    if not tenant.enabled:
        return ("tenant_disabled", "租户已禁用")
    if await tenants.is_tenant_expired(tenant_id):
        return ("tenant_expired", "租户套餐已过期，无法执行定时任务")
    return None


async def record_skipped(
    *,
    job_code: str,
    scope: ScheduledJobScope,
    tenant_id: int | None,
    manual: bool,
    params: Mapping[str, Any] | None,
    reason: str,
    summary: str,
    actor_user_id: int | None = None,
    actor_username: str | None = None,
    trigger_request_id: str | None = None,
) -> None:
    job = await ScheduledJobRepo(mysql_engine()).get_by_code(job_code)
    cron_expr = job.cron_expr if job is not None else ""
    trigger: ScheduledJobTriggerType = "manual" if manual else "cron"
    await ScheduledJobRunRepo(mysql_engine()).start_run(
        job_code=job_code,
        scope=scope,
        tenant_id=tenant_id,
        trigger_type=trigger,
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        trigger_request_id=trigger_request_id,
        params=dict(params) if params else None,
        context={
            "cron_expr": cron_expr,
            "manual": manual,
            "hostname": socket.gethostname(),
            "skip_reason": reason,
        },
        status="skipped",
        summary=summary,
    )
    if reason != "already_running":
        logger.info("跳过定时任务 %s：%s tenant_id=%s", job_code, reason, tenant_id)


async def _start_run_row(
    *,
    code: str,
    scope: ScheduledJobScope,
    tenant_id: int | None,
    manual: bool,
    cron_expr: str,
    params: Mapping[str, Any] | None,
    actor_user_id: int | None,
    actor_username: str | None,
    trigger_request_id: str | None,
) -> str:
    trigger: ScheduledJobTriggerType = "manual" if manual else "cron"
    return await ScheduledJobRunRepo(mysql_engine()).start_run(
        job_code=code,
        scope=scope,
        tenant_id=tenant_id,
        trigger_type=trigger,
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        trigger_request_id=trigger_request_id,
        params=dict(params) if params else None,
        context={
            "cron_expr": cron_expr,
            "manual": manual,
            "hostname": socket.gethostname(),
        },
    )


async def _finish_success(
    *,
    repo: ScheduledJobRepo,
    code: str,
    run_id: str,
    cron_expr: str,
    tenant_id: int | None,
    outcome: JobRunOutcome,
) -> None:
    status = as_run_status(outcome.status)
    await ScheduledJobRunRepo(mysql_engine()).finish_run(
        run_id,
        status=status,
        summary=outcome.summary,
        result=outcome.result or None,
        error_text=outcome.error_text,
    )
    await repo.record_run_result(
        code,
        status=status,
        message=outcome.summary[:512],
        cron_expr=cron_expr,
        tenant_id=tenant_id,
    )


async def _finish_failure(
    *,
    repo: ScheduledJobRepo,
    code: str,
    run_id: str,
    cron_expr: str,
    tenant_id: int | None,
    exc: Exception,
) -> None:
    logger.exception("定时任务 %s 执行失败", code)
    await ScheduledJobRunRepo(mysql_engine()).finish_run(
        run_id,
        status="failure",
        summary=str(exc)[:512],
        error_text=str(exc),
    )
    await repo.record_run_result(
        code,
        status="failure",
        message=str(exc)[:512],
        cron_expr=cron_expr,
        tenant_id=tenant_id,
    )


async def _maybe_skip_tenant(
    *,
    code: str,
    scope: ScheduledJobScope,
    tenant_id: int | None,
    manual: bool,
    params: Mapping[str, Any] | None,
) -> bool:
    """若应跳过则写记录并返回 True。"""
    skip = await tenant_skip_reason(tenant_id)
    if skip is None:
        return False
    if manual:
        raise ValueError(skip[1])
    await record_skipped(
        job_code=code,
        scope=scope,
        tenant_id=tenant_id,
        manual=manual,
        params=params,
        reason=skip[0],
        summary=skip[1],
    )
    return True


async def execute_job(
    code: str,
    *,
    manual: bool,
    tenant_id: int | None,
    params: Mapping[str, Any] | None = None,
    actor_user_id: int | None = None,
    actor_username: str | None = None,
    trigger_request_id: str | None = None,
) -> None:
    definition = get_job_definition(code)
    if definition is None:
        return
    if await _maybe_skip_tenant(
        code=code,
        scope=definition.scope,
        tenant_id=tenant_id,
        manual=manual,
        params=params,
    ):
        return
    repo = ScheduledJobRepo(mysql_engine())
    job = await repo.get_by_code(code)
    if job is None:
        return
    run_id = await _start_run_row(
        code=code,
        scope=definition.scope,
        tenant_id=tenant_id,
        manual=manual,
        cron_expr=job.cron_expr,
        params=params,
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        trigger_request_id=trigger_request_id,
    )
    await repo.mark_running(code, tenant_id=tenant_id)
    try:
        detail = await definition.handler(manual, tenant_id, params)
        await _finish_success(
            repo=repo,
            code=code,
            run_id=run_id,
            cron_expr=job.cron_expr,
            tenant_id=tenant_id,
            outcome=normalize_outcome(detail, manual=manual),
        )
    except Exception as exc:
        await _finish_failure(
            repo=repo,
            code=code,
            run_id=run_id,
            cron_expr=job.cron_expr,
            tenant_id=tenant_id,
            exc=exc,
        )
        if manual:
            raise
