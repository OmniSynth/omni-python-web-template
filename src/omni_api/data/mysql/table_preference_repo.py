"""用户表格偏好 MySQL 仓储。"""

from __future__ import annotations

import json
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.actor import get_actor_id
from omni_api.data.mysql.biz_table import SYS_USER_TABLE_PREFERENCE
from omni_api.schemas.table_preference import TablePreferenceConfig, TablePreferenceRecord

logger = logging.getLogger(__name__)


class TablePreferenceRepo:
    """用户表格偏好读写。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def get(
        self,
        user_id: int,
        page_key: str,
        table_key: str,
    ) -> TablePreferenceRecord | None:
        sql = text(
            f"SELECT config_json, updated_at FROM {SYS_USER_TABLE_PREFERENCE} "
            f"WHERE user_id=:uid AND page_key=:pk AND table_key=:tk LIMIT 1"
        )
        async with self._engine.connect() as conn:
            row = (
                await conn.execute(
                    sql,
                    {"uid": user_id, "pk": page_key, "tk": table_key},
                )
            ).fetchone()
        if row is None:
            return None
        config = TablePreferenceConfig.model_validate(json.loads(str(row[0])))
        return TablePreferenceRecord(
            page_key=page_key,
            table_key=table_key,
            config=config,
            updated_at=row[1],
        )

    async def upsert(
        self,
        user_id: int,
        page_key: str,
        table_key: str,
        config: TablePreferenceConfig,
        *,
        actor_id: int | None = None,
    ) -> TablePreferenceRecord:
        actor = actor_id if actor_id is not None else get_actor_id()
        payload = config.model_dump(mode="json", by_alias=True)
        sql = text(
            f"INSERT INTO {SYS_USER_TABLE_PREFERENCE} "
            f"(user_id, page_key, table_key, config_json, created_by, updated_by) "
            f"VALUES (:uid, :pk, :tk, :cfg, :actor, :actor) AS new_pref "
            f"ON DUPLICATE KEY UPDATE "
            f"config_json=new_pref.config_json, updated_by=new_pref.updated_by"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "uid": user_id,
                    "pk": page_key,
                    "tk": table_key,
                    "cfg": json.dumps(payload, ensure_ascii=False),
                    "actor": actor,
                },
            )
        record = await self.get(user_id, page_key, table_key)
        assert record is not None
        return record

    async def delete(self, user_id: int, page_key: str, table_key: str) -> bool:
        sql = text(
            f"DELETE FROM {SYS_USER_TABLE_PREFERENCE} "
            f"WHERE user_id=:uid AND page_key=:pk AND table_key=:tk"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql,
                {"uid": user_id, "pk": page_key, "tk": table_key},
            )
        return result.rowcount > 0
