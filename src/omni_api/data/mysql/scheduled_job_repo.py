"""定时任务 MySQL 仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.biz_table import SYS_SCHEDULED_JOB
from omni_api.data.mysql.list_sort import SortOrder, build_order_clause
from omni_api.data.mysql.utc import utc_now
from omni_api.schemas.scheduled_job import (
    ScheduledJobRecord,
    ScheduledJobRunStatus,
    ScheduledJobUpdate,
    croniter_from_expr,
)
from omni_api.services.scheduled_job_registry import (
    SCHEDULED_JOB_DEFINITIONS,
    get_job_definition,
)

_SORT_FIELDS = {
    "id": "id",
    "code": "code",
    "name": "name",
    "enabled": "enabled",
    "last_run_at": "last_run_at",
    "next_run_at": "next_run_at",
    "created_at": "created_at",
}

_SELECT = (
    f"SELECT id, code, name, description, cron_expr, enabled, "
    f"last_run_at, last_run_status, last_run_message, next_run_at, "
    f"created_at, updated_at FROM {SYS_SCHEDULED_JOB}"
)


def _compute_next_run_at(cron_expr: str, base: datetime | None = None) -> datetime:
    start = base or utc_now()
    return croniter_from_expr(cron_expr, start).get_next(datetime)


def _row_to_record(row: Sequence[Any], *, active: bool = False) -> ScheduledJobRecord:
    code = str(row[1])
    definition = get_job_definition(code)
    return ScheduledJobRecord(
        id=int(row[0]),
        code=code,
        name=str(row[2]),
        description=str(row[3]),
        cron_expr=str(row[4]),
        enabled=bool(row[5]),
        active=active,
        requires_tenant=True if definition is None else definition.requires_tenant,
        last_run_at=row[6],
        last_run_status=row[7],  # type: ignore[arg-type]
        last_run_message=str(row[8] or ""),
        next_run_at=row[9],
        created_at=row[10],
        updated_at=row[11],
    )


class ScheduledJobRepo:
    """系统定时任务配置。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def ensure_schema(self) -> None:
        await self._seed_definitions()

    async def _seed_definitions(self) -> None:
        for definition in SCHEDULED_JOB_DEFINITIONS:
            sql = text(
                f"SELECT id FROM {SYS_SCHEDULED_JOB} WHERE code = :code LIMIT 1"
            )
            async with self._engine.connect() as conn:
                exists = (await conn.execute(sql, {"code": definition.code})).fetchone()
            if exists is not None:
                continue
            next_run = _compute_next_run_at(definition.default_cron_expr)
            insert_sql = text(
                f"INSERT INTO {SYS_SCHEDULED_JOB} "
                f"(code, name, description, cron_expr, enabled, next_run_at, "
                f"created_by, updated_by) "
                f"VALUES (:code, :name, :description, :cron_expr, 1, :next_run_at, "
                f":created_by, :updated_by)"
            )
            async with self._engine.begin() as conn:
                await conn.execute(
                    insert_sql,
                    {
                        "code": definition.code,
                        "name": definition.name,
                        "description": definition.description,
                        "cron_expr": definition.default_cron_expr,
                        "next_run_at": next_run,
                        **audit_insert_params(),
                    },
                )

    async def list_jobs(
        self,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[ScheduledJobRecord]:
        order = build_order_clause(sort_by, sort_order, _SORT_FIELDS, default_field="id")
        sql = text(f"{_SELECT} {order}")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_record(row) for row in rows]

    async def get_by_code(self, code: str) -> ScheduledJobRecord | None:
        sql = text(f"{_SELECT} WHERE code = :code LIMIT 1")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"code": code})).fetchone()
        if row is None:
            return None
        return _row_to_record(row)

    async def update(self, code: str, body: ScheduledJobUpdate) -> ScheduledJobRecord | None:
        current = await self.get_by_code(code)
        if current is None:
            return None
        fields: list[str] = []
        params: dict[str, object] = {"code": code, **audit_update_params()}
        if body.cron_expr is not None:
            fields.append("cron_expr = :cron_expr")
            params["cron_expr"] = body.cron_expr
            params["next_run_at"] = _compute_next_run_at(body.cron_expr)
            fields.append("next_run_at = :next_run_at")
        if body.enabled is not None:
            fields.append("enabled = :enabled")
            params["enabled"] = 1 if body.enabled else 0
        if not fields:
            return current
        sql = text(
            f"UPDATE {SYS_SCHEDULED_JOB} SET {', '.join(fields)}, "
            f"updated_by = :updated_by WHERE code = :code"
        )
        async with self._engine.begin() as conn:
            await conn.execute(sql, params)
        return await self.get_by_code(code)

    async def mark_running(self, code: str) -> None:
        sql = text(
            f"UPDATE {SYS_SCHEDULED_JOB} SET last_run_status = 'running', "
            f"last_run_message = '', updated_by = :updated_by WHERE code = :code"
        )
        async with self._engine.begin() as conn:
            await conn.execute(sql, {"code": code, **audit_update_params()})

    async def record_run_result(
        self,
        code: str,
        *,
        status: ScheduledJobRunStatus,
        message: str,
        cron_expr: str,
    ) -> None:
        now = utc_now()
        next_run = _compute_next_run_at(cron_expr, now)
        sql = text(
            f"UPDATE {SYS_SCHEDULED_JOB} SET last_run_at = :last_run_at, "
            f"last_run_status = :status, last_run_message = :message, "
            f"next_run_at = :next_run_at, updated_by = :updated_by WHERE code = :code"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "code": code,
                    "last_run_at": now,
                    "status": status,
                    "message": message[:512],
                    "next_run_at": next_run,
                    **audit_update_params(),
                },
            )

    async def refresh_next_run_at(self, code: str, cron_expr: str) -> None:
        next_run = _compute_next_run_at(cron_expr)
        sql = text(
            f"UPDATE {SYS_SCHEDULED_JOB} SET next_run_at = :next_run_at, "
            f"updated_by = :updated_by WHERE code = :code"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {"code": code, "next_run_at": next_run, **audit_update_params()},
            )
