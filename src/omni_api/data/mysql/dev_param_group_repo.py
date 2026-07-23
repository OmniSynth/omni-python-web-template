"""开发参数分组主表仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.tenant_biz_repo import TenantBizRepo
from omni_api.data.mysql.tenant_context import resolve_tenant_id
from omni_api.data.mysql.tenant_schema_cache import ensure_tenant_biz_provisioned
from omni_api.schemas.dev_param import (
    DEV_PARAM_GROUP_DEFINITIONS,
    DevParamGroupRecord,
)


def _row_to_group(row: Sequence[Any]) -> DevParamGroupRecord:
    return DevParamGroupRecord(
        id=int(row[0]),
        name=str(row[1]),
        description=str(row[2] or ""),
        created_at=row[3],
        updated_at=row[4],
        created_by=int(row[5]) if row[5] is not None else None,
        updated_by=int(row[6]) if row[6] is not None else None,
    )


class DevParamGroupRepo(TenantBizRepo):
    """开发参数分组主表（名称、描述）。"""

    _GROUP_SELECT = (
        "id, name, description, created_at, updated_at, created_by, updated_by"
    )

    def __init__(self, engine: AsyncEngine, tenant_id: int | None = None) -> None:
        super().__init__(engine, "dev_param_group")
        self._explicit_tenant = tenant_id

    def _tid(self) -> int:
        return resolve_tenant_id(explicit=self._explicit_tenant)

    async def ensure_schema(self, tenant_id: int | None = None) -> None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await ensure_tenant_biz_provisioned(self._engine, tid)

    async def list_all(self, tenant_id: int | None = None) -> list[DevParamGroupRecord]:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(f"SELECT {self._GROUP_SELECT} FROM {t} ORDER BY id")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_group(r) for r in rows]

    async def list_with_param_count(
        self, tenant_id: int | None = None
    ) -> list[tuple[DevParamGroupRecord, int]]:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        group_t = self.table(tid)
        from omni_api.data.mysql.biz_table import biz_table

        params_table = biz_table("dev_params", tid)
        sql = text(
            f"SELECT g.id, g.name, g.description, g.created_at, g.updated_at, "
            f"g.created_by, g.updated_by, COUNT(p.id) AS param_count "
            f"FROM {group_t} g "
            f"LEFT JOIN {params_table} p ON p.group_id = g.id "
            f"GROUP BY g.id, g.name, g.description, g.created_at, g.updated_at, "
            f"g.created_by, g.updated_by "
            f"ORDER BY g.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        result: list[tuple[DevParamGroupRecord, int]] = []
        for row in rows:
            result.append((_row_to_group(row[:7]), int(row[7])))
        return result

    async def get_by_id(
        self, group_id: int, tenant_id: int | None = None
    ) -> DevParamGroupRecord | None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(f"SELECT {self._GROUP_SELECT} FROM {t} WHERE id = :id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": group_id})).fetchone()
        return _row_to_group(row) if row else None

    async def get_by_name(
        self, name: str, tenant_id: int | None = None
    ) -> DevParamGroupRecord | None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(f"SELECT {self._GROUP_SELECT} FROM {t} WHERE name = :name")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"name": name})).fetchone()
        return _row_to_group(row) if row else None

    async def get_id_for_key(
        self, group_key: str, tenant_id: int | None = None
    ) -> int:
        name = next(item[1] for item in DEV_PARAM_GROUP_DEFINITIONS if item[0] == group_key)
        rec = await self.get_by_name(name, tenant_id)
        if rec is None:
            raise RuntimeError(f"开发参数分组未初始化: {group_key}")
        return rec.id

    async def update(
        self,
        group_id: int,
        *,
        name: str,
        description: str,
        tenant_id: int | None = None,
    ) -> DevParamGroupRecord:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(
            f"UPDATE {t} SET name = :name, description = :description, "
            f"updated_by = :updated_by WHERE id = :id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "id": group_id,
                    "name": name,
                    "description": description,
                    **audit_update_params(),
                },
            )
        rec = await self.get_by_id(group_id, tid)
        if rec is None:
            raise RuntimeError(f"开发参数分组不存在: {group_id}")
        return rec

    async def ensure_defaults(self, tenant_id: int | None = None) -> None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        for _, name, description in DEV_PARAM_GROUP_DEFINITIONS:
            existing = await self.get_by_name(name, tid)
            if existing is not None:
                continue
            sql = text(
                f"INSERT INTO {t} (name, description, created_by, updated_by) "
                f"VALUES (:name, :description, :created_by, :updated_by)"
            )
            async with self._engine.begin() as conn:
                await conn.execute(
                    sql,
                    {
                        "name": name,
                        "description": description,
                        **audit_insert_params(),
                    },
                )
