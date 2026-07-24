"""系统级表统一建表（按外键依赖顺序）。"""

from __future__ import annotations

import asyncio

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.ddl_exec import execute_create_table_if_missing
from omni_api.data.mysql.sys_schema_migrate import ensure_sys_schema_migrations
from omni_api.data.mysql.sys_sql import all_sys_ddl_statements

_sys_schema_ready = False
_sys_schema_lock = asyncio.Lock()


def clear_sys_schema_cache() -> None:
    """测试或手工重建表后清空进程内缓存。"""
    global _sys_schema_ready
    _sys_schema_ready = False


async def ensure_sys_schema(engine: AsyncEngine) -> None:
    """按依赖顺序创建全部 t_sys_* 表（幂等，进程内仅执行一次）。"""
    global _sys_schema_ready
    if _sys_schema_ready:
        return
    async with _sys_schema_lock:
        if _sys_schema_ready:
            return
        async with engine.begin() as conn:
            for stmt in all_sys_ddl_statements():
                await execute_create_table_if_missing(conn, stmt)
            await ensure_sys_schema_migrations(conn)
        _sys_schema_ready = True
