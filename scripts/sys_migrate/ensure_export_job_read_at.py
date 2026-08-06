#!/usr/bin/env python3
"""【离线】导出任务表补齐 read_at 列（幂等）。

背景
  下载中心角标需区分「进行中 / 已完成未读」。
  正式 DDL 已含 read_at；旧库用本脚本补齐。

用法
  OMNI_PROFILE=local uv run scripts/sys_migrate/ensure_export_job_read_at.py --tenant-id 2
  OMNI_PROFILE=local uv run scripts/sys_migrate/ensure_export_job_read_at.py --all-tenants
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from omni_api.data.mysql.biz_table import biz_table
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.tenant_schema_cache import (
    clear_tenant_schema_cache,
    ensure_tenant_biz_provisioned,
)

_COLUMN = (
    "read_at",
    "DATETIME(6) NULL COMMENT '已读时间（UTC naive；空表示需提醒）'",
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


async def _column_exists(conn: AsyncConnection, table: str, column: str) -> bool:
    row = (
        await conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = :t AND column_name = :c LIMIT 1"
            ),
            {"t": table, "c": column},
        )
    ).first()
    return row is not None


async def _ensure_column(engine: AsyncEngine, tenant_id: int) -> None:
    await ensure_tenant_biz_provisioned(engine, tenant_id)
    table = biz_table("export_job", tenant_id)
    col, ddl = _COLUMN
    async with engine.begin() as conn:
        if await _column_exists(conn, table, col):
            print(f"tenant={tenant_id} {col} 已存在，跳过加列")
        else:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
            print(f"tenant={tenant_id} 已添加 {col}")
        # 历史已完成/失败任务视为已读，避免角标突增
        result = await conn.execute(
            text(
                f"UPDATE {table} SET read_at = COALESCE(updated_at, created_at) "
                f"WHERE status IN ('done', 'failed') AND read_at IS NULL"
            )
        )
        print(f"tenant={tenant_id} 历史已读回填 {int(result.rowcount or 0)} 行")


async def main() -> None:
    parser = argparse.ArgumentParser(description="补齐导出任务 read_at 列")
    parser.add_argument("--tenant-id", type=int, default=None)
    parser.add_argument("--all-tenants", action="store_true")
    args = parser.parse_args()
    clear_tenant_schema_cache()
    engine = mysql_engine()
    for tid in await _tenant_ids(engine, args.tenant_id, args.all_tenants):
        await _ensure_column(engine, tid)


if __name__ == "__main__":
    asyncio.run(main())
