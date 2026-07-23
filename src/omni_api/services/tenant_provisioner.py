"""租户业务物理分表开通。"""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_sql import all_biz_ddl_statements
from omni_api.data.mysql.ddl_exec import execute_create_table_if_missing
from omni_api.data.mysql.tenant_schema_cache import (
    is_tenant_biz_provisioned,
    run_provision_once,
)

logger = logging.getLogger(__name__)


class TenantProvisioner:
    """为新租户创建全部 t_biz_*_{tenant_id} 物理表。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def provision(self, tenant_id: int) -> None:
        """确保租户业务表存在；已开通租户零 DDL。"""
        if await is_tenant_biz_provisioned(self._engine, tenant_id):
            return
        await self.provision_ddl(tenant_id)

    async def provision_ddl(self, tenant_id: int) -> None:
        """执行建表（仅新租户或 sync_rbac 场景）。"""
        if await is_tenant_biz_provisioned(self._engine, tenant_id):
            return

        async def _run() -> None:
            statements = all_biz_ddl_statements(tenant_id)
            async with self._engine.begin() as conn:
                for stmt in statements:
                    await execute_create_table_if_missing(conn, stmt)
            logger.info("租户 %s 业务表已开通（%d 张）", tenant_id, len(statements))

        await run_provision_once(tenant_id, _run)

    async def table_exists(self, tenant_id: int, base: str) -> bool:
        from sqlalchemy import text

        from omni_api.data.mysql.biz_table import biz_table

        table_name = biz_table(base, tenant_id)
        sql = text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name = :name LIMIT 1"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"name": table_name})).fetchone()
        return row is not None
