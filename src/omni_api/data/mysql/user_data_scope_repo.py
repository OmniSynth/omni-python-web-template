"""用户自定义数据权限 MySQL 仓储（租户物理分表）。"""

from __future__ import annotations

from typing import cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params
from omni_api.data.mysql.biz_table import biz_table
from omni_api.schemas.tenant import RoleDataScopeItem, ScopeItemType
from omni_api.data.mysql.tenant_schema_cache import ensure_tenant_biz_provisioned


class UserDataScopeRepo:
    """租户内用户 data_scope=4 时的自定义范围。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    def _table(self, tenant_id: int) -> str:
        return biz_table("user_data_scope", tenant_id)

    async def ensure_schema(self, tenant_id: int) -> None:
        await ensure_tenant_biz_provisioned(self._engine, tenant_id)

    async def get_scopes(self, tenant_id: int, user_id: int) -> list[RoleDataScopeItem]:
        await self.ensure_schema(tenant_id)
        sql = text(f"SELECT scope_type, scope_id FROM {self._table(tenant_id)} WHERE user_id=:uid")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        return [
            RoleDataScopeItem(scope_type=cast(ScopeItemType, str(row[0])), scope_id=int(row[1]))
            for row in rows
        ]

    async def set_scopes(
        self,
        tenant_id: int,
        user_id: int,
        scopes: list[RoleDataScopeItem],
    ) -> None:
        await self.ensure_schema(tenant_id)
        table = self._table(tenant_id)
        async with self._engine.begin() as conn:
            await conn.execute(text(f"DELETE FROM {table} WHERE user_id=:uid"), {"uid": user_id})
            if not scopes:
                return
            insert_sql = text(
                f"INSERT INTO {table} (user_id, scope_type, scope_id, created_by, updated_by) "
                f"VALUES (:uid, :stype, :sid, :created_by, :updated_by)"
            )
            audit = audit_insert_params()
            for item in scopes:
                await conn.execute(
                    insert_sql,
                    {
                        "uid": user_id,
                        "stype": item.scope_type,
                        "sid": item.scope_id,
                        **audit,
                    },
                )
