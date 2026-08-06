"""导出任务实时推送：角标 + 本人任务变更。"""

from __future__ import annotations

import time
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.export_job_repo import ExportJobRepo
from omni_api.schemas.realtime import CHANNEL_EXPORT_JOB_BADGE, CHANNEL_EXPORT_JOB_MINE
from omni_api.services.realtime_hub import realtime_hub

_PROGRESS_MIN_INTERVAL = 1.0


class _ProgressThrottle:
    """导出进度推送节流（按 tenant+job）。"""

    __slots__ = ("_last",)

    def __init__(self) -> None:
        self._last: dict[tuple[int, int], float] = {}

    def allow(self, tenant_id: int, job_id: int, *, force: bool) -> bool:
        key = (tenant_id, job_id)
        now = time.monotonic()
        if force:
            self._last[key] = now
            return True
        last = self._last.get(key, 0.0)
        if now - last < _PROGRESS_MIN_INTERVAL:
            return False
        self._last[key] = now
        return True


_THROTTLE = _ProgressThrottle()


async def notify_export_job_changed(
    engine: AsyncEngine,
    *,
    tenant_id: int,
    user_id: int,
    job_id: int,
    status: str,
    progress_current: int | None = None,
    progress_total: int | None = None,
    force: bool = True,
) -> None:
    """推送 mine 变更与最新角标；进度类调用可设 force=False 节流。"""
    if not _THROTTLE.allow(tenant_id, job_id, force=force):
        return
    payload: dict[str, Any] = {"job_id": job_id, "status": status}
    if progress_current is not None:
        payload["progress_current"] = progress_current
    if progress_total is not None:
        payload["progress_total"] = progress_total
    hub = realtime_hub()
    hub.publish_user(
        tenant_id=tenant_id,
        user_id=user_id,
        channel=CHANNEL_EXPORT_JOB_MINE,
        event_type="changed",
        payload=payload,
    )
    await notify_export_badge(engine, tenant_id=tenant_id, user_id=user_id)


async def notify_export_badge(
    engine: AsyncEngine, *, tenant_id: int, user_id: int
) -> None:
    repo = ExportJobRepo(engine, tenant_id=tenant_id)
    active, done_unread = await repo.badge_counts_for_user(user_id, tenant_id=tenant_id)
    realtime_hub().publish_user(
        tenant_id=tenant_id,
        user_id=user_id,
        channel=CHANNEL_EXPORT_JOB_BADGE,
        event_type="update",
        payload={"active_count": active, "done_unread_count": done_unread},
    )
