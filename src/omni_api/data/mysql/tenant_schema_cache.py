"""租户业务表开通状态进程内缓存（避免热路径重复 DDL）。"""

from __future__ import annotations

import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_sql import all_biz_ddl_statements

_provisioned_tenants: set[int] = set()
_provision_lock = asyncio.Lock()


def clear_tenant_schema_cache() -> None:
    """测试或手工重建表后清空缓存。"""
    from omni_api.data.mysql.audit_log_repo import clear_audit_schema_cache
    from omni_api.data.mysql.slow_sql_repo import clear_slow_sql_schema_cache
    from omni_api.data.mysql.sys_schema import clear_sys_schema_cache

    _provisioned_tenants.clear()
    clear_sys_schema_cache()
    clear_audit_schema_cache()
    clear_slow_sql_schema_cache()


def _expected_biz_table_count() -> int:
    return len(all_biz_ddl_statements(0))


async def is_tenant_biz_provisioned(engine: AsyncEngine, tenant_id: int) -> bool:
    """租户业务分表是否已开通（内存缓存 + 单次 information_schema 探测）。"""
    if tenant_id in _provisioned_tenants:
        return True
    pattern = f"t_biz_%_{tenant_id}"
    sql = text(
        "SELECT COUNT(*) FROM information_schema.tables "
        "WHERE table_schema = DATABASE() AND table_name LIKE :pat"
    )
    async with engine.connect() as conn:
        row = (await conn.execute(sql, {"pat": pattern})).fetchone()
    count = int(row[0]) if row else 0
    if count >= _expected_biz_table_count():
        _provisioned_tenants.add(tenant_id)
        return True
    return False


async def ensure_tenant_biz_provisioned(engine: AsyncEngine, tenant_id: int) -> None:
    """确保租户业务分表存在；已开通时立即返回，不执行 DDL。"""
    if await is_tenant_biz_provisioned(engine, tenant_id):
        return
    from omni_api.services.tenant_provisioner import TenantProvisioner

    await TenantProvisioner(engine).provision_ddl(tenant_id)


async def run_provision_once(tenant_id: int, runner) -> None:
    """租户业务表 DDL 仅执行一次（新租户首次开通）。"""
    if tenant_id in _provisioned_tenants:
        return
    async with _provision_lock:
        if tenant_id in _provisioned_tenants:
            return
        await runner()
        _provisioned_tenants.add(tenant_id)
