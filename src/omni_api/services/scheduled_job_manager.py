"""统一定时任务调度管理器。"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.scheduled_job_repo import ScheduledJobRepo
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.utc import utc_now
from omni_api.schemas.scheduled_job import (
    ScheduledJobRecord,
    ScheduledJobUpdate,
    croniter_from_expr,
)
from omni_api.services.scheduled_job_registry import get_job_definition

logger = logging.getLogger(__name__)


class ScheduledJobManager:
    """按数据库配置调度内置任务，支持启停与立即触发。"""

    _instance: ScheduledJobManager | None = None

    def __init__(self) -> None:
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._stop_events: dict[str, asyncio.Event] = {}
        self._cron_exprs: dict[str, str] = {}
        self._manual_tasks: set[asyncio.Task[None]] = set()
        self._execute_locks: dict[str, asyncio.Lock] = {}

    @classmethod
    def get(cls) -> ScheduledJobManager:
        if cls._instance is None:
            cls._instance = ScheduledJobManager()
        return cls._instance

    def _repo(self) -> ScheduledJobRepo:
        return ScheduledJobRepo(mysql_engine())

    def is_active(self, code: str) -> bool:
        task = self._tasks.get(code)
        return task is not None and not task.done()

    async def startup(self) -> None:
        repo = self._repo()
        await repo.ensure_schema()
        jobs = await repo.list_jobs()
        for job in jobs:
            if job.enabled:
                await self._start_job(job.code, job.cron_expr)
        logger.info("定时任务管理器已启动，活动任务 %d 个", len(self._tasks))

    async def shutdown(self) -> None:
        for code in list(self._tasks.keys()):
            await self._stop_job(code)
        for task in list(self._manual_tasks):
            task.cancel()
        if self._manual_tasks:
            await asyncio.gather(*self._manual_tasks, return_exceptions=True)
        self._manual_tasks.clear()
        logger.info("定时任务管理器已停止")

    async def list_jobs(self) -> list[ScheduledJobRecord]:
        jobs = await self._repo().list_jobs()
        return [job.model_copy(update={"active": self.is_active(job.code)}) for job in jobs]

    async def get_job(self, code: str) -> ScheduledJobRecord | None:
        job = await self._repo().get_by_code(code)
        if job is None:
            return None
        return job.model_copy(update={"active": self.is_active(code)})

    async def update_job(self, code: str, body: ScheduledJobUpdate) -> ScheduledJobRecord | None:
        if get_job_definition(code) is None:
            return None
        updated = await self._repo().update(code, body)
        if updated is None:
            return None
        if body.enabled is True:
            await self._start_job(code, updated.cron_expr)
        elif body.enabled is False:
            await self._stop_job(code)
        elif body.cron_expr is not None and self.is_active(code):
            await self._reload_job(code, updated.cron_expr)
        return updated.model_copy(update={"active": self.is_active(code)})

    async def start_job(self, code: str) -> ScheduledJobRecord | None:
        return await self.update_job(code, ScheduledJobUpdate(enabled=True))

    async def stop_job(self, code: str) -> ScheduledJobRecord | None:
        return await self.update_job(code, ScheduledJobUpdate(enabled=False))

    async def trigger_job(self, code: str, *, tenant_id: int | None = None) -> None:
        definition = get_job_definition(code)
        if definition is None:
            raise ValueError(f"未知任务: {code}")
        run_tenant_id: int | None = tenant_id
        if definition.requires_tenant:
            if run_tenant_id is None:
                raise ValueError("请选择执行租户")
            tenant = await TenantRepo(mysql_engine()).get_by_id(run_tenant_id)
            if tenant is None:
                raise ValueError("租户不存在")
            if not tenant.enabled:
                raise ValueError("租户已禁用，无法执行")
        else:
            run_tenant_id = tenant_id
        lock = self._execute_locks.setdefault(code, asyncio.Lock())
        if lock.locked():
            raise RuntimeError(f"任务 {code} 正在执行中，请稍后再试")
        task_name = (
            f"manual-{code}-tenant-{run_tenant_id}"
            if run_tenant_id is not None
            else f"manual-{code}"
        )
        task = asyncio.create_task(
            self._execute_job(code, manual=True, tenant_id=run_tenant_id),
            name=task_name,
        )
        self._manual_tasks.add(task)
        task.add_done_callback(self._manual_tasks.discard)

    async def _reload_job(self, code: str, cron_expr: str) -> None:
        await self._stop_job(code)
        await self._start_job(code, cron_expr)

    async def _start_job(self, code: str, cron_expr: str) -> None:
        if get_job_definition(code) is None:
            logger.warning("跳过未知任务: %s", code)
            return
        if self.is_active(code):
            if self._cron_exprs.get(code) == cron_expr:
                return
            await self._stop_job(code)
        stop_event = asyncio.Event()
        self._stop_events[code] = stop_event
        self._cron_exprs[code] = cron_expr
        self._tasks[code] = asyncio.create_task(
            self._loop(code, cron_expr, stop_event),
            name=f"scheduled-{code}",
        )
        await self._repo().refresh_next_run_at(code, cron_expr)
        logger.info("定时任务 %s 已启动，cron=%s", code, cron_expr)

    async def _stop_job(self, code: str) -> None:
        stop_event = self._stop_events.pop(code, None)
        task = self._tasks.pop(code, None)
        self._cron_exprs.pop(code, None)
        if stop_event is not None:
            stop_event.set()
        if task is None:
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        logger.info("定时任务 %s 已停止", code)

    async def _loop(self, code: str, cron_expr: str, stop_event: asyncio.Event) -> None:
        while not stop_event.is_set():
            now = utc_now()
            next_at = croniter_from_expr(cron_expr, now).get_next(datetime)
            wait_sec = max((next_at - now).total_seconds(), 0.0)
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=wait_sec)
                break
            except TimeoutError:
                pass
            if stop_event.is_set():
                break
            await self._execute_job(code, manual=False, tenant_id=None)

    async def _execute_job(self, code: str, *, manual: bool, tenant_id: int | None) -> None:
        definition = get_job_definition(code)
        if definition is None:
            return
        lock = self._execute_locks.setdefault(code, asyncio.Lock())
        if lock.locked():
            msg = f"任务 {code} 正在执行中，请稍后再试"
            if manual:
                raise RuntimeError(msg)
            logger.info("跳过重叠调度: %s", code)
            return
        async with lock:
            repo = self._repo()
            job = await repo.get_by_code(code)
            if job is None:
                return
            cron_expr = job.cron_expr
            await repo.mark_running(code)
            try:
                detail = await definition.handler(manual, tenant_id)
                message = detail if detail else ("手动触发成功" if manual else "执行成功")
                await repo.record_run_result(
                    code,
                    status="success",
                    message=message[:512],
                    cron_expr=cron_expr,
                )
            except Exception as exc:
                logger.exception("定时任务 %s 执行失败", code)
                await repo.record_run_result(
                    code,
                    status="failure",
                    message=str(exc)[:512],
                    cron_expr=cron_expr,
                )
                if manual:
                    raise
