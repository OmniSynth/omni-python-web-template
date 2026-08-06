"""导出任务进程内排队与并发限流。"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.background_context import (
    BackgroundMysqlContext,
    use_background_mysql_context,
)
from omni_api.data.mysql.export_job_repo import ExportJobRepo
from omni_api.services.export_job_builder import (
    XLSX_CONTENT_TYPE,
    ExportFile,
    get_export_builder,
)
from omni_api.services.export_job_realtime import notify_export_job_changed
from omni_api.storage.factory import (
    ObjectStoreFactory,
    config_from_params,
    load_tenant_oss_params,
)
from omni_api.storage.keys import tenant_export_object_key

logger = logging.getLogger(__name__)

_MAX_CONCURRENT = 2
_MAX_QUEUE_SIZE = 100
USER_ACTIVE_LIMIT = 10
_BUSY_DETAIL = "系统繁忙，请稍后再试"


@dataclass(frozen=True, slots=True)
class ExportJobWorkItem:
    engine: AsyncEngine
    tenant_id: int
    user_id: int
    job_id: int
    source_type: str
    filename: str
    filter_payload: dict[str, Any]
    ctx: BackgroundMysqlContext


class ExportJobWorkerPool:
    """单例：固定 worker 数消费队列，控制全局并发。"""

    def __init__(self) -> None:
        self._queue: asyncio.Queue[ExportJobWorkItem] = asyncio.Queue(
            maxsize=_MAX_QUEUE_SIZE
        )
        self._workers: list[asyncio.Task[None]] = []
        self._started = False
        self._start_lock = asyncio.Lock()

    async def ensure_started(self) -> None:
        async with self._start_lock:
            if self._started:
                return
            for i in range(_MAX_CONCURRENT):
                task = asyncio.create_task(self._loop(i), name=f"export-worker-{i}")
                self._workers.append(task)
            self._started = True
            logger.info(
                "导出队列已启动 concurrent=%s queue_size=%s",
                _MAX_CONCURRENT,
                _MAX_QUEUE_SIZE,
            )

    async def submit(self, item: ExportJobWorkItem) -> None:
        await self.ensure_started()
        try:
            self._queue.put_nowait(item)
        except asyncio.QueueFull as exc:
            raise HTTPException(status_code=503, detail=_BUSY_DETAIL) from exc

    async def _loop(self, worker_id: int) -> None:
        while True:
            item = await self._queue.get()
            try:
                await _run_work_item(item)
            except Exception:
                logger.exception(
                    "导出 worker=%s 未捕获异常 tenant=%s job=%s",
                    worker_id,
                    item.tenant_id,
                    item.job_id,
                )
            finally:
                self._queue.task_done()


_POOL = ExportJobWorkerPool()


async def enqueue_export_job(item: ExportJobWorkItem) -> None:
    await _POOL.submit(item)


async def _run_work_item(item: ExportJobWorkItem) -> None:
    async with use_background_mysql_context(item.ctx):
        await _execute_export(item)


async def _execute_export(item: ExportJobWorkItem) -> None:
    repo = ExportJobRepo(item.engine, tenant_id=item.tenant_id)
    try:
        await repo.update_job(
            item.job_id, tenant_id=item.tenant_id, status="running", error_message=""
        )
        await notify_export_job_changed(
            item.engine,
            tenant_id=item.tenant_id,
            user_id=item.user_id,
            job_id=item.job_id,
            status="running",
        )
        file = await _build_file(item, repo)
        object_key, public_url = await _upload(
            item.engine, item.tenant_id, item.job_id, file.filename, file.content
        )
        await _mark_done(repo, item, file, object_key, public_url)
    except Exception as exc:
        await _mark_failed(repo, item, exc)


async def _build_file(item: ExportJobWorkItem, repo: ExportJobRepo) -> ExportFile:
    builder = get_export_builder(item.source_type)
    if builder is None:
        raise RuntimeError(f"未注册导出类型：{item.source_type}")

    async def on_progress(current: int, total: int) -> None:
        await repo.update_job(
            item.job_id,
            tenant_id=item.tenant_id,
            status="running",
            progress_current=current,
            progress_total=total,
        )
        await notify_export_job_changed(
            item.engine,
            tenant_id=item.tenant_id,
            user_id=item.user_id,
            job_id=item.job_id,
            status="running",
            progress_current=current,
            progress_total=total,
            force=False,
        )

    return await builder(
        engine=item.engine,
        tenant_id=item.tenant_id,
        filename=item.filename,
        filter_payload=item.filter_payload,
        on_progress=on_progress,
    )


async def _mark_done(
    repo: ExportJobRepo,
    item: ExportJobWorkItem,
    file: ExportFile,
    object_key: str,
    public_url: str,
) -> None:
    await repo.update_job(
        item.job_id,
        tenant_id=item.tenant_id,
        status="done",
        filename=file.filename,
        content_type=file.content_type,
        file_size=len(file.content),
        object_key=object_key,
        public_url=public_url,
        row_count=file.row_count,
        progress_current=file.row_count,
        progress_total=file.row_count,
        error_message="",
        read_at=None,
    )
    await notify_export_job_changed(
        item.engine,
        tenant_id=item.tenant_id,
        user_id=item.user_id,
        job_id=item.job_id,
        status="done",
        progress_current=file.row_count,
        progress_total=file.row_count,
    )


async def _mark_failed(
    repo: ExportJobRepo, item: ExportJobWorkItem, exc: BaseException
) -> None:
    logger.exception("导出任务失败 tenant=%s job=%s", item.tenant_id, item.job_id)
    msg = str(exc).strip() or "导出失败，请稍后重试"
    if len(msg) > 480:
        msg = msg[:480]
    await repo.update_job(
        item.job_id, tenant_id=item.tenant_id, status="failed", error_message=msg
    )
    await notify_export_job_changed(
        item.engine,
        tenant_id=item.tenant_id,
        user_id=item.user_id,
        job_id=item.job_id,
        status="failed",
    )


async def _upload(
    engine: AsyncEngine,
    tenant_id: int,
    job_id: int,
    filename: str,
    content: bytes,
) -> tuple[str, str]:
    params = await load_tenant_oss_params(engine, tenant_id)
    config = config_from_params(params)
    store = ObjectStoreFactory.from_config(config)
    object_key = tenant_export_object_key(config.basic_path, job_id, filename)
    public_url = await asyncio.to_thread(
        store.put_bytes, object_key, content, content_type=XLSX_CONTENT_TYPE
    )
    return object_key, public_url
