"""系统开发参数仓储。"""

from __future__ import annotations

import os
from collections.abc import Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.biz_table import SYS_DEV_PARAM
from omni_api.data.mysql.sys_dev_param_group_repo import SysDevParamGroupRepo
from omni_api.schemas.dev_param import DevParamRecord
from omni_api.schemas.oss_param import (
    OSS_PARAM_ACCESS_KEY,
    OSS_PARAM_SECRET_KEY,
    OSS_SECRET_KEYS,
)
from omni_api.schemas.sys_dev_param import SYS_DEV_PARAM_DEFINITIONS

_ENV_BOOTSTRAP: dict[str, str] = {
    OSS_PARAM_ACCESS_KEY: "OMNI_SYS_OSS_ACCESS_KEY",
    OSS_PARAM_SECRET_KEY: "OMNI_SYS_OSS_SECRET_KEY",
}


def _row_to_record(row: Sequence[Any]) -> DevParamRecord:
    return DevParamRecord(
        param_key=str(row[0]),
        group_id=int(row[1]),
        param_value=str(row[2] or ""),
        remark=str(row[3] or ""),
        created_at=row[4],
        updated_at=row[5],
    )


class SysDevParamRepo:
    """系统开发参数 key-value 仓储。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._groups = SysDevParamGroupRepo(engine)

    async def list_by_group_id(self, group_id: int) -> list[DevParamRecord]:
        sql = text(
            f"SELECT param_key, group_id, param_value, remark, created_at, updated_at "
            f"FROM {SYS_DEV_PARAM} WHERE group_id = :gid ORDER BY param_key"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"gid": group_id})).fetchall()
        return [_row_to_record(r) for r in rows]

    async def list_all(self) -> list[DevParamRecord]:
        sql = text(
            f"SELECT param_key, group_id, param_value, remark, created_at, updated_at "
            f"FROM {SYS_DEV_PARAM} ORDER BY group_id, param_key"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_record(r) for r in rows]

    async def get_value(self, key: str) -> str | None:
        sql = text(f"SELECT param_value FROM {SYS_DEV_PARAM} WHERE param_key = :key")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"key": key})).fetchone()
        return str(row[0]) if row else None

    async def get_map(self) -> dict[str, str]:
        return {r.param_key: r.param_value for r in await self.list_all()}

    async def upsert(self, key: str, value: str, remark: str = "") -> DevParamRecord:
        meta = next((item for item in SYS_DEV_PARAM_DEFINITIONS if item.param_key == key), None)
        if meta is None:
            raise ValueError(f"不支持的系统开发参数: {key}")
        await self._groups.ensure_defaults()
        group_id = await self._groups.get_id_for_key(meta.group_key)
        existing = await self.get_value(key)
        if existing is None:
            sql = text(
                f"INSERT INTO {SYS_DEV_PARAM} (group_id, param_key, param_value, remark, "
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
                f"UPDATE {SYS_DEV_PARAM} SET param_value = :val, remark = :remark, "
                f"updated_by = :updated_by WHERE param_key = :key"
            )
            params = {"key": key, "val": value, "remark": remark, **audit_update_params()}
        async with self._engine.begin() as conn:
            await conn.execute(sql, params)
        for rec in await self.list_all():
            if rec.param_key == key:
                return rec
        raise RuntimeError(f"系统开发参数写入后未找到: {key}")

    async def ensure_defaults(self) -> None:
        await self._groups.ensure_defaults()
        for meta in SYS_DEV_PARAM_DEFINITIONS:
            if await self.get_value(meta.param_key) is not None:
                continue
            seed = meta.default_value
            if meta.param_key in OSS_SECRET_KEYS:
                env_name = _ENV_BOOTSTRAP.get(meta.param_key)
                env_val = os.environ.get(env_name, "").strip() if env_name else ""
                seed = env_val
            await self.upsert(meta.param_key, seed)
