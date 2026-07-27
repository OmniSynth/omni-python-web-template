"""系统开发参数分组仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.biz_table import SYS_DEV_PARAM, SYS_DEV_PARAM_GROUP
from omni_api.schemas.dev_param import DevParamGroupRecord
from omni_api.schemas.sys_dev_param import SYS_DEV_PARAM_GROUP_DEFINITIONS


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


class SysDevParamGroupRepo:
    """系统开发参数分组主表。"""

    _GROUP_SELECT = (
        "id, name, description, created_at, updated_at, created_by, updated_by"
    )

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def list_all(self) -> list[DevParamGroupRecord]:
        sql = text(
            f"SELECT {self._GROUP_SELECT} FROM {SYS_DEV_PARAM_GROUP} ORDER BY id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_group(r) for r in rows]

    async def list_with_param_count(self) -> list[tuple[DevParamGroupRecord, int]]:
        sql = text(
            f"SELECT g.id, g.name, g.description, g.created_at, g.updated_at, "
            f"g.created_by, g.updated_by, COUNT(p.id) AS param_count "
            f"FROM {SYS_DEV_PARAM_GROUP} g "
            f"LEFT JOIN {SYS_DEV_PARAM} p ON p.group_id = g.id "
            f"GROUP BY g.id, g.name, g.description, g.created_at, g.updated_at, "
            f"g.created_by, g.updated_by "
            f"ORDER BY g.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [(_row_to_group(row[:7]), int(row[7])) for row in rows]

    async def get_by_id(self, group_id: int) -> DevParamGroupRecord | None:
        sql = text(
            f"SELECT {self._GROUP_SELECT} FROM {SYS_DEV_PARAM_GROUP} WHERE id = :id"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": group_id})).fetchone()
        return _row_to_group(row) if row else None

    async def get_by_name(self, name: str) -> DevParamGroupRecord | None:
        sql = text(
            f"SELECT {self._GROUP_SELECT} FROM {SYS_DEV_PARAM_GROUP} WHERE name = :name"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"name": name})).fetchone()
        return _row_to_group(row) if row else None

    async def get_id_for_key(self, group_key: str) -> int:
        name = next(
            item[1] for item in SYS_DEV_PARAM_GROUP_DEFINITIONS if item[0] == group_key
        )
        rec = await self.get_by_name(name)
        if rec is None:
            raise RuntimeError(f"系统开发参数分组未初始化: {group_key}")
        return rec.id

    async def update(
        self, group_id: int, *, name: str, description: str
    ) -> DevParamGroupRecord:
        sql = text(
            f"UPDATE {SYS_DEV_PARAM_GROUP} SET name = :name, description = :description, "
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
        rec = await self.get_by_id(group_id)
        if rec is None:
            raise RuntimeError(f"系统开发参数分组不存在: {group_id}")
        return rec

    async def ensure_defaults(self) -> None:
        for _, name, description in SYS_DEV_PARAM_GROUP_DEFINITIONS:
            if await self.get_by_name(name) is not None:
                continue
            sql = text(
                f"INSERT INTO {SYS_DEV_PARAM_GROUP} "
                f"(name, description, created_by, updated_by) "
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
