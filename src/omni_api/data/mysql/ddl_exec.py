"""DDL 幂等执行（避免 MySQL 客户端警告刷屏）。"""

from __future__ import annotations

import re

from sqlalchemy import text

_TABLE_NAME_RE = re.compile(
    r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(`?)([\w]+)\1\s*\(",
    re.IGNORECASE,
)


def parse_create_table_name(ddl: str) -> str | None:
    """从 CREATE TABLE IF NOT EXISTS 语句解析表名。"""
    match = _TABLE_NAME_RE.search(ddl.strip())
    if match is None:
        return None
    return match.group(2)


async def table_exists(conn, table: str) -> bool:
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


async def execute_create_table_if_missing(conn, ddl: str) -> bool:
    """表已存在时跳过 CREATE TABLE IF NOT EXISTS，避免 MySQL 1050 警告输出。

    返回 True 表示执行了 CREATE；False 表示表已存在已跳过。
    """
    stmt = ddl.strip()
    table = parse_create_table_name(stmt)
    if table is not None and await table_exists(conn, table):
        return False
    await conn.execute(text(stmt))
    return True
