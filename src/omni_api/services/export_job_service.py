"""异步导出任务：入队下载中心，由 worker 排队限流执行。"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.background_context import capture_background_mysql_context
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.export_job_repo import ExportJobRepo, dumps_filter
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.export_job import (
    ExportJobBadge,
    ExportJobCreateResult,
    ExportJobMarkReadResult,
    ExportJobRecord,
    PaginatedExportJob,
)
from omni_api.services.export_job_builder import get_export_builder
from omni_api.services.export_job_realtime import (
    notify_export_badge,
    notify_export_job_changed,
)
from omni_api.services.export_job_worker import (
    USER_ACTIVE_LIMIT,
    ExportJobWorkItem,
    enqueue_export_job,
)

logger = logging.getLogger(__name__)


class ExportJobService:
    def __init__(self, engine: AsyncEngine | None = None, tenant_id: int | None = None) -> None:
        self._engine = engine or mysql_engine()
        self._tenant_id = tenant_id
        self._repo = ExportJobRepo(self._engine, tenant_id=tenant_id)

    async def list_page(
        self,
        user: UserRecord,
        *,
        keyword: str | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedExportJob:
        return await self._repo.list_page(
            user_id=user.id,
            keyword=keyword,
            status=status,
            page=page,
            page_size=page_size,
            tenant_id=self._tenant_id,
        )

    async def get_owned(self, user: UserRecord, job_id: int) -> ExportJobRecord:
        item = await self._repo.get_owned(job_id, user.id, tenant_id=self._tenant_id)
        if item is None:
            raise HTTPException(status_code=404, detail="导出记录不存在")
        return item

    async def badge(self, user: UserRecord) -> ExportJobBadge:
        active, done_unread = await self._repo.badge_counts_for_user(
            user.id, tenant_id=self._tenant_id
        )
        return ExportJobBadge(active_count=active, done_unread_count=done_unread)

    async def mark_done_read(self, user: UserRecord) -> ExportJobMarkReadResult:
        marked = await self._repo.mark_badge_read_for_user(
            user.id, tenant_id=self._tenant_id
        )
        if self._tenant_id is not None:
            await notify_export_badge(
                self._engine, tenant_id=self._tenant_id, user_id=user.id
            )
        return ExportJobMarkReadResult(marked=marked)

    async def mark_job_read(self, user: UserRecord, job_id: int) -> ExportJobMarkReadResult:
        item = await self._repo.get_owned(job_id, user.id, tenant_id=self._tenant_id)
        if item is None:
            raise HTTPException(status_code=404, detail="导出记录不存在")
        await self._repo.mark_job_read(job_id, user.id, tenant_id=self._tenant_id)
        if self._tenant_id is not None:
            await notify_export_badge(
                self._engine, tenant_id=self._tenant_id, user_id=user.id
            )
        return ExportJobMarkReadResult(marked=1)

    async def enqueue(
        self,
        user: UserRecord,
        *,
        source_type: str,
        source_label: str,
        filename: str,
        filter_payload: dict[str, Any] | None = None,
    ) -> ExportJobCreateResult:
        """业务域入队入口：须先 register_export_builder(source_type, ...)。"""
        if get_export_builder(source_type) is None:
            raise HTTPException(status_code=400, detail=f"未注册导出类型：{source_type}")
        await self._ensure_user_capacity(user.id)
        return await self._enqueue(
            user,
            source_type=source_type,
            source_label=source_label,
            filename=filename,
            filter_payload=filter_payload or {},
        )

    async def _ensure_user_capacity(self, user_id: int) -> None:
        n = await self._repo.count_active_for_user(user_id, tenant_id=self._tenant_id)
        if n >= USER_ACTIVE_LIMIT:
            raise HTTPException(status_code=429, detail="导出排队已满，请稍后再试")

    async def _enqueue(
        self,
        user: UserRecord,
        *,
        source_type: str,
        source_label: str,
        filename: str,
        filter_payload: dict[str, Any],
    ) -> ExportJobCreateResult:
        tid = self._tenant_id
        if tid is None:
            raise HTTPException(status_code=400, detail="缺少租户上下文")
        job_id = await self._repo.insert_job(
            source_type=source_type,
            source_label=source_label,
            filter_json=dumps_filter(filter_payload),
            filename=filename,
            tenant_id=tid,
        )
        item = ExportJobWorkItem(
            engine=self._engine,
            tenant_id=tid,
            user_id=user.id,
            job_id=job_id,
            source_type=source_type,
            filename=filename,
            filter_payload=filter_payload,
            ctx=capture_background_mysql_context(),
        )
        await self._submit_or_fail(user.id, tid, job_id, item)
        await notify_export_job_changed(
            self._engine, tenant_id=tid, user_id=user.id, job_id=job_id, status="queued"
        )
        logger.info(
            "导出已入队 user=%s tenant=%s job=%s type=%s",
            user.id,
            tid,
            job_id,
            source_type,
        )
        return ExportJobCreateResult(job_id=job_id, message="已加入下载中心")

    async def _submit_or_fail(
        self, user_id: int, tid: int, job_id: int, item: ExportJobWorkItem
    ) -> None:
        try:
            await enqueue_export_job(item)
        except HTTPException as exc:
            await self._repo.update_job(
                job_id,
                tenant_id=tid,
                status="failed",
                error_message=str(exc.detail),
            )
            await notify_export_job_changed(
                self._engine,
                tenant_id=tid,
                user_id=user_id,
                job_id=job_id,
                status="failed",
            )
            raise
