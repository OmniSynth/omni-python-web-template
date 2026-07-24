"""系统表增量迁移（幂等 ALTER）。"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from omni_api.data.mysql.biz_table import SYS_TENANT
from omni_api.data.mysql.ddl_comment import cmt


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
    idx_row = (
        await conn.execute(
            text(
                "SELECT 1 FROM information_schema.statistics "
                "WHERE table_schema = DATABASE() AND table_name = :table "
                "AND index_name = :idx LIMIT 1"
            ),
            {"table": SYS_TENANT, "idx": "idx_sys_tenant_expiry"},
        )
    ).fetchone()
    if idx_row is None:
        await conn.execute(
            text(f"ALTER TABLE {SYS_TENANT} ADD KEY idx_sys_tenant_expiry (expires_at, enabled)")
        )
