"""系统表增量迁移（幂等 ALTER）。"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from omni_api.data.mysql.biz_table import SYS_SCHEDULED_JOB, SYS_SCHEDULED_JOB_TENANT, SYS_TENANT
from omni_api.data.mysql.ddl_comment import cmt
from omni_api.data.mysql.sys_sql import create_scheduled_job_tenant_sql


async def _column_exists(conn: AsyncConnection, table: str, column: str) -> bool:
    row = (
        await conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = :table "
                "AND column_name = :column LIMIT 1"
            ),
            {"table": table, "column": column},
        )
    ).fetchone()
    return row is not None


async def _table_exists(conn: AsyncConnection, table: str) -> bool:
    row = (
        await conn.execute(
            text(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = DATABASE() AND table_name = :table LIMIT 1"
            ),
            {"table": table},
        )
    ).fetchone()
    return row is not None


async def _index_exists(conn: AsyncConnection, table: str, index_name: str) -> bool:
    row = (
        await conn.execute(
            text(
                "SELECT 1 FROM information_schema.statistics "
                "WHERE table_schema = DATABASE() AND table_name = :table "
                "AND index_name = :idx LIMIT 1"
            ),
            {"table": table, "idx": index_name},
        )
    ).fetchone()
    return row is not None


async def ensure_sys_schema_migrations(conn: AsyncConnection) -> None:
    """为已有库补齐增量列/索引。"""
    if not await _column_exists(conn, SYS_TENANT, "expires_at"):
        await conn.execute(
            text(
                f"ALTER TABLE {SYS_TENANT} "
                f"ADD COLUMN expires_at DATETIME(6) NULL"
                f"{cmt('套餐到期时间(UTC naive)；空为永不过期')} "
                f"AFTER enabled"
            )
        )
    if not await _index_exists(conn, SYS_TENANT, "idx_sys_tenant_expiry"):
        await conn.execute(
            text(f"ALTER TABLE {SYS_TENANT} ADD KEY idx_sys_tenant_expiry (expires_at, enabled)")
        )

    if await _table_exists(conn, SYS_SCHEDULED_JOB):
        if not await _column_exists(conn, SYS_SCHEDULED_JOB, "scope"):
            await conn.execute(
                text(
                    f"ALTER TABLE {SYS_SCHEDULED_JOB} "
                    f"ADD COLUMN scope VARCHAR(16) NOT NULL DEFAULT 'tenant'"
                    f"{cmt('任务范围：system系统 tenant租户')} "
                    f"AFTER description"
                )
            )
        if not await _index_exists(conn, SYS_SCHEDULED_JOB, "idx_scheduled_job_scope"):
            await conn.execute(
                text(f"ALTER TABLE {SYS_SCHEDULED_JOB} ADD KEY idx_scheduled_job_scope (scope)")
            )

    if not await _table_exists(conn, SYS_SCHEDULED_JOB_TENANT):
        for stmt in create_scheduled_job_tenant_sql().split(";"):
            cleaned = stmt.strip()
            if cleaned:
                await conn.execute(text(cleaned))
