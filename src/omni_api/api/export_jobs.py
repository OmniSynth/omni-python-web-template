"""下载中心：导出任务列表 / 角标 / 已读 / 详情。"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from omni_api.api.deps_tenant import current_tenant_id, require_tenant_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.export_job import (
    ExportJobBadge,
    ExportJobMarkReadResult,
    ExportJobRecord,
    PaginatedExportJob,
)
from omni_api.services.export_job_service import ExportJobService

router = APIRouter(prefix="/api/v1/export-jobs", tags=["export-jobs"])


@router.get("", response_model=PaginatedExportJob)
async def list_export_jobs(
    keyword: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    tenant_id: int = Depends(current_tenant_id),
    actor: UserRecord = Depends(require_tenant_permission("export.job.list")),
) -> PaginatedExportJob:
    """仅返回当前用户发起的导出记录。"""
    return await ExportJobService(mysql_engine(), tenant_id=tenant_id).list_page(
        actor, keyword=keyword, status=status, page=page, page_size=page_size
    )


@router.get("/badge", response_model=ExportJobBadge)
async def export_job_badge(
    tenant_id: int = Depends(current_tenant_id),
    actor: UserRecord = Depends(require_tenant_permission("export.job.list")),
) -> ExportJobBadge:
    """顶栏提醒数量：进行中 + 已完成未读。"""
    return await ExportJobService(mysql_engine(), tenant_id=tenant_id).badge(actor)


@router.post("/mark-read", response_model=ExportJobMarkReadResult)
async def mark_export_jobs_read(
    tenant_id: int = Depends(current_tenant_id),
    actor: UserRecord = Depends(require_tenant_permission("export.job.list")),
) -> ExportJobMarkReadResult:
    """进入下载中心时将未读提醒标为已读。"""
    return await ExportJobService(mysql_engine(), tenant_id=tenant_id).mark_done_read(
        actor
    )


@router.get("/{job_id}", response_model=ExportJobRecord)
async def get_export_job(
    job_id: int,
    tenant_id: int = Depends(current_tenant_id),
    actor: UserRecord = Depends(require_tenant_permission("export.job.list")),
) -> ExportJobRecord:
    return await ExportJobService(mysql_engine(), tenant_id=tenant_id).get_owned(
        actor, job_id
    )


@router.post("/{job_id}/mark-read", response_model=ExportJobMarkReadResult)
async def mark_export_job_read(
    job_id: int,
    tenant_id: int = Depends(current_tenant_id),
    actor: UserRecord = Depends(require_tenant_permission("export.job.list")),
) -> ExportJobMarkReadResult:
    """下载前将单条已完成任务标为已读。"""
    return await ExportJobService(mysql_engine(), tenant_id=tenant_id).mark_job_read(
        actor, job_id
    )
