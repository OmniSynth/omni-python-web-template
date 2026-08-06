"""导出任务过期清理（定时任务）。"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Mapping
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.export_job_repo import ExportJobRepo
from omni_api.schemas.scheduled_job import JobRunOutcome
from omni_api.storage.factory import (
    ObjectStoreFactory,
    config_from_params,
    load_tenant_oss_params,
)
from omni_api.storage.types import ObjectStore

logger = logging.getLogger(__name__)

_BATCH = 200
_MAX_ROUNDS = 50


async def cleanup_expired_export_jobs_job(
    _manual: bool,
    tenant_id: int | None = None,
    _params: Mapping[str, Any] | None = None,
) -> JobRunOutcome:
    if tenant_id is None:
        raise ValueError("导出清理任务须指定租户")
    deleted, oss_err = await cleanup_expired_export_jobs(tenant_id)
    status = "partial" if oss_err > 0 and deleted > 0 else "success"
    return JobRunOutcome(
        status=status,
        summary=f"t{tenant_id}:deleted={deleted},oss_err={oss_err}",
        result={"deleted": deleted, "oss_err": oss_err},
    )


async def cleanup_expired_export_jobs(tenant_id: int) -> tuple[int, int]:
    """删除过期导出记录及对应 OSS 对象；返回 (删除行数, OSS 失败数)。"""
    engine = mysql_engine()
    repo = ExportJobRepo(engine, tenant_id=tenant_id)
    store: ObjectStore | None = None
    deleted = 0
    oss_err = 0
    for _ in range(_MAX_ROUNDS):
        rows = await repo.list_expired(tenant_id=tenant_id, limit=_BATCH)
        if not rows:
            break
        store, round_oss_err = await _purge_oss(engine, tenant_id, store, rows)
        oss_err += round_oss_err
        ids = [int(r["id"]) for r in rows]
        deleted += await repo.delete_by_ids(ids, tenant_id=tenant_id)
        if len(rows) < _BATCH:
            break
    return deleted, oss_err


async def _purge_oss(
    engine: AsyncEngine,
    tenant_id: int,
    store: ObjectStore | None,
    rows: list[dict[str, Any]],
) -> tuple[ObjectStore | None, int]:
    keys = [str(r.get("object_key") or "").strip() for r in rows]
    keys = [k for k in keys if k]
    if not keys:
        return store, 0
    if store is None:
        store = await _load_store(engine, tenant_id)
    failed = 0
    for key in keys:
        try:
            await asyncio.to_thread(store.delete, key)
        except Exception:
            failed += 1
            logger.exception("删除导出对象失败 tenant=%s key=%s", tenant_id, key)
    return store, failed


async def _load_store(engine: AsyncEngine, tenant_id: int) -> ObjectStore:
    params = await load_tenant_oss_params(engine, tenant_id)
    return ObjectStoreFactory.from_config(config_from_params(params))
