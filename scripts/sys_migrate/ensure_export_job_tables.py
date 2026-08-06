#!/usr/bin/env python3
"""【离线】为已有租户创建导出任务表（幂等）。

背景
  新增 t_biz_export_job_{tenant}（下载中心异步导出）。
  新租户开通时会走 all_biz_ddl_statements；旧租户需本脚本补表。

用法
  OMNI_PROFILE=local uv run scripts/sys_migrate/ensure_export_job_tables.py --tenant-id 2
  OMNI_PROFILE=local uv run scripts/sys_migrate/ensure_export_job_tables.py --all-tenants
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.tenant_schema_cache import (
    clear_tenant_schema_cache,
    ensure_tenant_biz_provisioned,
)


async def _tenant_ids(engine: AsyncEngine, explicit: int | None, all_tenants: bool) -> list[int]:
    if explicit is not None:
        return [explicit]
    if not all_tenants:
        raise SystemExit("请指定 --tenant-id 或 --all-tenants")
    async with engine.connect() as conn:
        rows = (
            await conn.execute(text("SELECT id FROM t_sys_tenant WHERE enabled = 1 ORDER BY id"))
        ).mappings().all()
    return [int(r["id"]) for r in rows]


async def main() -> None:
    parser = argparse.ArgumentParser(description="确保导出任务租户表存在")
    parser.add_argument("--tenant-id", type=int, default=None)
    parser.add_argument("--all-tenants", action="store_true")
    args = parser.parse_args()
    clear_tenant_schema_cache()
    engine = mysql_engine()
    ids = await _tenant_ids(engine, args.tenant_id, args.all_tenants)
    for tid in ids:
        await ensure_tenant_biz_provisioned(engine, tid)
        print(f"tenant={tid} 导出任务表已确保")


if __name__ == "__main__":
    asyncio.run(main())
