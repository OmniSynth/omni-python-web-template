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
    TenantScheduledJobRecord,
    croniter_from_expr,
)
from omni_api.services.scheduled_job_registry import get_job_definition
from omni_api.services.tenant_expiry import is_expired_at

logger = logging.getLogger(__name__)


def _run_key(code: str, tenant_id: int | None) -> str:
    return f"{code}:{tenant_id or 0}"


class ScheduledJobManager:
    """按数据库配置调度内置任务，支持启停与立即触发。"""

    _instance: ScheduledJobManager | None = None

    def __init__(self) -> None:
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._stop_events: dict[str, asyncio.Event] = {}
        self._cron_exprs: dict[str, str] = {}
        self._run_tasks: dict[str, asyncio.Task[None]] = {}
        self._claim_guard = asyncio.Lock()
        self._running_keys: set[str] = set()

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
        for task in list(self._run_tasks.values()):
            task.cancel()
        if self._run_tasks:
            await asyncio.gather(*self._run_tasks.values(), return_exceptions=True)
        self._run_tasks.clear()
        self._running_keys.clear()
        logger.info("定时任务管理器已停止")

    async def list_jobs(self) -> list[ScheduledJobRecord]:
        jobs = await self._repo().list_jobs()
        return [job.model_copy(update={"active": self.is_active(job.code)}) for job in jobs]

    async def list_tenant_jobs(self, tenant_id: int) -> list[TenantScheduledJobRecord]:
        return await self._repo().list_tenant_jobs(tenant_id)

    async def is_tenant_schedule_enabled(self, code: str, tenant_id: int) -> bool:
        return await self._repo().is_tenant_schedule_enabled(code, tenant_id)

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
        updated = await self.update_job(code, ScheduledJobUpdate(enabled=True))
        if updated is None:
            return None
        if updated.scope == "tenant":
            await self._repo().enable_all_tenant_schedules(code)
        return updated

    async def stop_job(
        self, code: str, *, tenant_id: int | None = None
    ) -> ScheduledJobRecord | None:
        definition = get_job_definition(code)
        if definition is None:
            return None
        if tenant_id is not None:
            if definition.scope != "tenant":
                raise ValueError("系统级任务不支持按租户停止")
            tenant = await TenantRepo(mysql_engine()).get_by_id(tenant_id)
            if tenant is None:
                raise ValueError("租户不存在")
            await self._cancel_run(code, tenant_id)
            await self._repo().set_tenant_schedule_enabled(code, tenant_id, enabled=False)
            return await self.get_job(code)
        return await self.update_job(code, ScheduledJobUpdate(enabled=False))

    async def trigger_job(self, code: str, *, tenant_id: int | None = None) -> bool:
        """尝试启动一次执行。已在执行中则返回 False（调用方仍返回相同成功文案）。"""
        definition = get_job_definition(code)
        if definition is None:
            raise ValueError(f"未知任务: {code}")
        run_tenant_id = await self._resolve_trigger_tenant(definition.scope, tenant_id)
        return await self._spawn_run(code, manual=True, tenant_id=run_tenant_id)

    async def _resolve_trigger_tenant(
        self, scope: str, tenant_id: int | None
    ) -> int | None:
        if scope == "tenant":
            if tenant_id is None:
                raise ValueError("请选择执行租户")
            tenant = await TenantRepo(mysql_engine()).get_by_id(tenant_id)
            if tenant is None:
                raise ValueError("租户不存在")
            if not tenant.enabled:
                raise ValueError("租户已禁用，无法执行")
            if is_expired_at(tenant.expires_at):
                raise ValueError("租户套餐已过期，无法执行定时任务")
            return tenant_id
        return tenant_id

    async def _spawn_run(self, code: str, *, manual: bool, tenant_id: int | None) -> bool:
        key = _run_key(code, tenant_id)
        async with self._claim_guard:
            if key in self._running_keys:
                return False
            self._running_keys.add(key)
        task = asyncio.create_task(
            self._execute_claimed(code, manual=manual, tenant_id=tenant_id, key=key),
            name=f"{'manual' if manual else 'cron'}-{key}",
        )
        self._run_tasks[key] = task

        def _on_done(_done: asyncio.Task[None]) -> None:
            self._run_tasks.pop(key, None)

        task.add_done_callback(_on_done)
        return True

    async def _cancel_run(self, code: str, tenant_id: int | None) -> None:
        key = _run_key(code, tenant_id)
        task = self._run_tasks.get(key)
        if task is not None and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        async with self._claim_guard:
            self._running_keys.discard(key)

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
            await self._dispatch_scheduled(code)

    async def _dispatch_scheduled(self, code: str) -> None:
        definition = get_job_definition(code)
        if definition is None:
            return
        if definition.scope == "system":
            await self._spawn_run(code, manual=False, tenant_id=None)
            return
        tenant_ids = await TenantRepo(mysql_engine()).list_active_tenant_ids()
        repo = self._repo()
        for tenant_id in tenant_ids:
            if not await repo.is_tenant_schedule_enabled(code, tenant_id):
                continue
            await self._spawn_run(code, manual=False, tenant_id=tenant_id)

    async def _execute_claimed(
        self, code: str, *, manual: bool, tenant_id: int | None, key: str
    ) -> None:
        try:
            await self._execute_job(code, manual=manual, tenant_id=tenant_id)
        finally:
            async with self._claim_guard:
                self._running_keys.discard(key)

    async def _execute_job(self, code: str, *, manual: bool, tenant_id: int | None) -> None:
        definition = get_job_definition(code)
        if definition is None:
            return
        if not await self._ensure_tenant_job_runnable(code, tenant_id, manual=manual):
            return
        repo = self._repo()
        job = await repo.get_by_code(code)
        if job is None:
            return
        cron_expr = job.cron_expr
        await repo.mark_running(code, tenant_id=tenant_id)
        try:
            detail = await definition.handler(manual, tenant_id)
            message = detail if detail else ("手动触发成功" if manual else "执行成功")
            await repo.record_run_result(
                code,
                status="success",
                message=message[:512],
                cron_expr=cron_expr,
                tenant_id=tenant_id,
            )
        except Exception as exc:
            logger.exception("定时任务 %s 执行失败", code)
            await repo.record_run_result(
                code,
                status="failure",
                message=str(exc)[:512],
                cron_expr=cron_expr,
                tenant_id=tenant_id,
            )
            if manual:
                raise

    async def _ensure_tenant_job_runnable(
        self, code: str, tenant_id: int | None, *, manual: bool
    ) -> bool:
        if tenant_id is None:
            return True
        tenant = await TenantRepo(mysql_engine()).get_by_id(tenant_id)
        if tenant is None:
            if manual:
                raise ValueError("租户不存在")
            logger.info("跳过定时任务 %s：租户不存在", code)
            return False
        if not tenant.enabled or is_expired_at(tenant.expires_at):
            if manual:
                raise ValueError("租户套餐已过期，无法执行定时任务")
            logger.info("跳过定时任务 %s：租户已禁用或已过期 tenant_id=%s", code, tenant_id)
            return False
        return True
