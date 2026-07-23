"""开发参数子表仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.dev_param_group_repo import DevParamGroupRepo
from omni_api.data.mysql.tenant_biz_repo import TenantBizRepo
from omni_api.data.mysql.tenant_context import resolve_tenant_id
from omni_api.data.mysql.tenant_schema_cache import ensure_tenant_biz_provisioned
from omni_api.schemas.dev_param import DEV_PARAM_DEFINITIONS, DevParamRecord


def _row_to_record(row: Sequence[Any]) -> DevParamRecord:
    return DevParamRecord(
        param_key=str(row[0]),
        group_id=int(row[1]),
        param_value=str(row[2] or ""),
        remark=str(row[3] or ""),
        created_at=row[4],
        updated_at=row[5],
    )


class DevParamRepo(TenantBizRepo):
    """开发参数 key-value 子表仓储（无部门隔离）。"""

    def __init__(self, engine: AsyncEngine, tenant_id: int | None = None) -> None:
        super().__init__(engine, "dev_params")
        self._explicit_tenant = tenant_id
        self._groups = DevParamGroupRepo(engine, tenant_id=tenant_id)

    def _tid(self) -> int:
        return resolve_tenant_id(explicit=self._explicit_tenant)

    async def ensure_schema(self, tenant_id: int | None = None) -> None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await ensure_tenant_biz_provisioned(self._engine, tid)

    async def list_by_group_id(
        self, group_id: int, tenant_id: int | None = None
    ) -> list[DevParamRecord]:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(
            f"SELECT param_key, group_id, param_value, remark, created_at, updated_at "
            f"FROM {t} WHERE group_id = :gid ORDER BY param_key"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"gid": group_id})).fetchall()
        return [_row_to_record(r) for r in rows]

    async def list_all(self, tenant_id: int | None = None) -> list[DevParamRecord]:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(
            f"SELECT param_key, group_id, param_value, remark, created_at, updated_at "
            f"FROM {t} ORDER BY group_id, param_key"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_record(r) for r in rows]

    async def get_value(self, key: str, tenant_id: int | None = None) -> str | None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        t = self.table(tid)
        sql = text(f"SELECT param_value FROM {t} WHERE param_key = :key")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"key": key})).fetchone()
        return str(row[0]) if row else None

    async def upsert(
        self,
        key: str,
        value: str,
        remark: str = "",
        tenant_id: int | None = None,
    ) -> DevParamRecord:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self.ensure_schema(tid)
        await self._groups.ensure_defaults(tid)
        meta = next((item for item in DEV_PARAM_DEFINITIONS if item[0] == key), None)
        if meta is None:
            raise ValueError(f"不支持的开发参数: {key}")
        _, group_key, _, _, _ = meta
        group_id = await self._groups.get_id_for_key(group_key, tid)
        t = self.table(tid)
        existing = await self.get_value(key, tid)
        if existing is None:
            sql = text(
                f"INSERT INTO {t} (group_id, param_key, param_value, remark, "
                f"created_by, updated_by) VALUES (:gid, :key, :val, :remark, "
                f":created_by, :updated_by)"
            )
            params = {
                "gid": group_id,
                "key": key,
                "val": value,
                "remark": remark,
                **audit_insert_params(),
            }
        else:
            sql = text(
                f"UPDATE {t} SET param_value = :val, remark = :remark, "
                f"updated_by = :updated_by WHERE param_key = :key"
            )
            params = {"key": key, "val": value, "remark": remark, **audit_update_params()}
        async with self._engine.begin() as conn:
            await conn.execute(sql, params)
        records = await self.list_all(tid)
        for rec in records:
            if rec.param_key == key:
                return rec
        raise RuntimeError(f"开发参数写入后未找到: {key}")

    async def ensure_defaults(self, tenant_id: int | None = None) -> None:
        tid = tenant_id if tenant_id is not None else self._tid()
        await self._groups.ensure_defaults(tid)
        for key, _, _, _, _ in DEV_PARAM_DEFINITIONS:
            if await self.get_value(key, tid) is not None:
                continue
            await self.upsert(key, "", tenant_id=tid)
