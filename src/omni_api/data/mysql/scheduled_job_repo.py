"""定时任务 MySQL 仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.biz_table import SYS_SCHEDULED_JOB, SYS_SCHEDULED_JOB_TENANT
from omni_api.data.mysql.list_sort import SortOrder, build_order_clause
from omni_api.data.mysql.scheduled_job_run_repo import ScheduledJobRunRepo
from omni_api.data.mysql.utc import utc_now
from omni_api.schemas.scheduled_job import (
    ScheduledJobRecord,
    ScheduledJobRunStatus,
    ScheduledJobScope,
    ScheduledJobUpdate,
    TenantScheduledJobRecord,
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
    "scope": "scope",
    "enabled": "enabled",
    "last_run_at": "last_run_at",
    "next_run_at": "next_run_at",
    "created_at": "created_at",
}

_SELECT = (
    f"SELECT id, code, name, description, scope, cron_expr, enabled, "
    f"last_run_at, last_run_status, last_run_message, next_run_at, "
    f"created_at, updated_at FROM {SYS_SCHEDULED_JOB}"
)


def _compute_next_run_at(cron_expr: str, base: datetime | None = None) -> datetime:
    start = base or utc_now()
    return croniter_from_expr(cron_expr, start).get_next(datetime)


def _row_to_record(row: Sequence[Any], *, active: bool = False) -> ScheduledJobRecord:
    code = str(row[1])
    scope_raw = str(row[4] or "tenant")
    scope: ScheduledJobScope = "system" if scope_raw == "system" else "tenant"
    definition = get_job_definition(code)
    if definition is not None:
        scope = definition.scope
    return ScheduledJobRecord(
        id=int(row[0]),
        code=code,
        name=str(row[2]),
        description=str(row[3]),
        scope=scope,
        cron_expr=str(row[5]),
        enabled=bool(row[6]),
        active=active,
        requires_tenant=scope == "tenant",
        last_run_at=row[7],
        last_run_status=row[8],  # type: ignore[arg-type]
        last_run_message=str(row[9] or ""),
        next_run_at=row[10],
        created_at=row[11],
        updated_at=row[12],
    )


class ScheduledJobRepo:
    """系统定时任务配置与租户调度状态。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def ensure_schema(self) -> None:
        await ScheduledJobRunRepo(self._engine).ensure_schema()
        await self._seed_definitions()

    async def _seed_definitions(self) -> None:
        for definition in SCHEDULED_JOB_DEFINITIONS:
            existing = await self.get_by_code(definition.code)
            if existing is None:
                await self._insert_definition(definition)
                continue
            await self._sync_definition_meta(definition)

    async def _insert_definition(self, definition: object) -> None:
        from omni_api.services.scheduled_job_registry import ScheduledJobDefinition

        assert isinstance(definition, ScheduledJobDefinition)
        next_run = _compute_next_run_at(definition.default_cron_expr)
        insert_sql = text(
            f"INSERT INTO {SYS_SCHEDULED_JOB} "
            f"(code, name, description, scope, cron_expr, enabled, next_run_at, "
            f"created_by, updated_by) "
            f"VALUES (:code, :name, :description, :scope, :cron_expr, 1, :next_run_at, "
            f":created_by, :updated_by)"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                insert_sql,
                {
                    "code": definition.code,
                    "name": definition.name,
                    "description": definition.description,
                    "scope": definition.scope,
                    "cron_expr": definition.default_cron_expr,
                    "next_run_at": next_run,
                    **audit_insert_params(),
                },
            )

    async def _sync_definition_meta(self, definition: object) -> None:
        from omni_api.services.scheduled_job_registry import ScheduledJobDefinition

        assert isinstance(definition, ScheduledJobDefinition)
        sql = text(
            f"UPDATE {SYS_SCHEDULED_JOB} SET name = :name, description = :description, "
            f"scope = :scope, updated_by = :updated_by WHERE code = :code"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "code": definition.code,
                    "name": definition.name,
                    "description": definition.description,
                    "scope": definition.scope,
                    **audit_update_params(),
                },
            )

    async def list_jobs(
        self,
        *,
        scope: ScheduledJobScope | None = None,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[ScheduledJobRecord]:
        order = build_order_clause(sort_by, sort_order, _SORT_FIELDS, default_field="id")
        if scope is None:
            sql = text(f"{_SELECT} {order}")
            params: dict[str, object] = {}
        else:
            sql = text(f"{_SELECT} WHERE scope = :scope {order}")
            params = {"scope": scope}
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, params)).fetchall()
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

    async def mark_running(self, code: str, *, tenant_id: int | None = None) -> None:
        if tenant_id is None:
            sql = text(
                f"UPDATE {SYS_SCHEDULED_JOB} SET last_run_status = 'running', "
                f"last_run_message = '', updated_by = :updated_by WHERE code = :code"
            )
            async with self._engine.begin() as conn:
                await conn.execute(sql, {"code": code, **audit_update_params()})
            return
        await self._upsert_tenant_run(
            code, tenant_id, status="running", message="", occurred_at=None
        )

    async def record_run_result(
        self,
        code: str,
        *,
        status: ScheduledJobRunStatus,
        message: str,
        cron_expr: str,
        tenant_id: int | None = None,
    ) -> None:
        now = utc_now()
        if tenant_id is not None:
            await self._upsert_tenant_run(
                code, tenant_id, status=status, message=message[:512], occurred_at=now
            )
            return
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

    async def is_tenant_schedule_enabled(self, code: str, tenant_id: int) -> bool:
        """无租户状态行时默认启用调度。"""
        sql = text(
            f"SELECT enabled FROM {SYS_SCHEDULED_JOB_TENANT} "
            f"WHERE job_code = :code AND tenant_id = :tid LIMIT 1"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"code": code, "tid": tenant_id})).fetchone()
        if row is None:
            return True
        return bool(row[0])

    async def set_tenant_schedule_enabled(
        self, code: str, tenant_id: int, *, enabled: bool
    ) -> None:
        sql = text(
            f"INSERT INTO {SYS_SCHEDULED_JOB_TENANT} "
            f"(job_code, tenant_id, enabled, created_by, updated_by) "
            f"VALUES (:code, :tid, :enabled, :created_by, :updated_by) "
            f"ON DUPLICATE KEY UPDATE enabled = :enabled, updated_by = :updated_by"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "code": code,
                    "tid": tenant_id,
                    "enabled": 1 if enabled else 0,
                    **audit_insert_params(),
                },
            )

    async def enable_all_tenant_schedules(self, code: str) -> int:
        """全局启动时恢复该任务下所有租户调度。"""
        sql = text(
            f"UPDATE {SYS_SCHEDULED_JOB_TENANT} SET enabled = 1, updated_by = :updated_by "
            f"WHERE job_code = :code AND enabled = 0"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql, {"code": code, **audit_update_params()}
            )
        return int(result.rowcount or 0)

    async def list_tenant_jobs(self, tenant_id: int) -> list[TenantScheduledJobRecord]:
        jobs = await self.list_jobs(scope="tenant")
        result: list[TenantScheduledJobRecord] = []
        for job in jobs:
            state = await self._get_tenant_state(job.code, tenant_id)
            tenant_enabled = True if state is None else bool(state["enabled"])
            # 任务状态：全局调度启用且本租户未单独停止
            effective_enabled = bool(job.enabled) and tenant_enabled
            result.append(
                TenantScheduledJobRecord(
                    code=job.code,
                    name=job.name,
                    description=job.description,
                    scope="tenant",
                    cron_expr=job.cron_expr,
                    schedule_enabled=effective_enabled,
                    last_run_at=None if state is None else state["last_run_at"],
                    last_run_status=None if state is None else state["last_run_status"],
                    next_run_at=job.next_run_at if effective_enabled else None,
                )
            )
        return result

    async def _get_tenant_state(self, code: str, tenant_id: int) -> dict[str, Any] | None:
        sql = text(
            f"SELECT enabled, last_run_at, last_run_status "
            f"FROM {SYS_SCHEDULED_JOB_TENANT} "
            f"WHERE job_code = :code AND tenant_id = :tid LIMIT 1"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"code": code, "tid": tenant_id})).fetchone()
        if row is None:
            return None
        return {
            "enabled": bool(row[0]),
            "last_run_at": row[1],
            "last_run_status": row[2],
        }

    async def _upsert_tenant_run(
        self,
        code: str,
        tenant_id: int,
        *,
        status: ScheduledJobRunStatus,
        message: str,
        occurred_at: datetime | None,
    ) -> None:
        sql = text(
            f"INSERT INTO {SYS_SCHEDULED_JOB_TENANT} "
            f"(job_code, tenant_id, enabled, last_run_at, last_run_status, last_run_message, "
            f"created_by, updated_by) "
            f"VALUES (:code, :tid, 1, :last_run_at, :status, :message, :created_by, :updated_by) "
            f"ON DUPLICATE KEY UPDATE last_run_at = COALESCE(:last_run_at, last_run_at), "
            f"last_run_status = :status, last_run_message = :message, updated_by = :updated_by"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "code": code,
                    "tid": tenant_id,
                    "last_run_at": occurred_at,
                    "status": status,
                    "message": message,
                    **audit_insert_params(),
                },
            )
