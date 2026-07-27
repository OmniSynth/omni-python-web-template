"""定时任务执行记录仓储（append-only）。"""

from __future__ import annotations

import json
import uuid
from collections.abc import Sequence
from datetime import datetime
from typing import Any, cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.audit.mask import truncate_text
from omni_api.data.mysql.biz_table import SYS_SCHEDULED_JOB_RUN
from omni_api.data.mysql.ddl_exec import execute_create_table_if_missing
from omni_api.data.mysql.sys_sql import create_scheduled_job_run_sql
from omni_api.data.mysql.utc import utc_now
from omni_api.schemas.scheduled_job import (
    PaginatedScheduledJobRuns,
    ScheduledJobRunQuery,
    ScheduledJobRunRecord,
    ScheduledJobRunStatus,
    ScheduledJobScope,
    ScheduledJobTriggerType,
)

_SELECT = (
    f"SELECT id, run_id, job_code, scope, tenant_id, trigger_type, actor_user_id, "
    f"actor_username, trigger_request_id, params_json, context_json, status, summary, "
    f"result_json, error_text, started_at, finished_at, duration_ms "
    f"FROM {SYS_SCHEDULED_JOB_RUN}"
)
_SUMMARY_MAX = 2048
_ERROR_MAX = 4096


def _json_dumps(obj: dict[str, Any] | None) -> str | None:
    if obj is None:
        return None
    # 执行关节可含较长 playlet_ids，不做审计 mask 的列表截断
    return json.dumps(_mask_payload(obj), ensure_ascii=False, default=str)


def _mask_payload(value: Any, *, depth: int = 0) -> Any:
    if depth > 8:
        return "[truncated:depth]"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return value if len(value) <= 4000 else value[:4000] + "…[truncated]"
    if isinstance(value, dict):
        return {str(k): _mask_payload(v, depth=depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_mask_payload(v, depth=depth + 1) for v in value]
    return str(value)


def _json_loads(raw: Any) -> dict[str, Any] | None:
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        loaded = json.loads(raw)
        return loaded if isinstance(loaded, dict) else None
    return None


def _row_to_record(row: Sequence[Any]) -> ScheduledJobRunRecord:
    scope_raw = str(row[3] or "tenant")
    scope: ScheduledJobScope = "system" if scope_raw == "system" else "tenant"
    trigger_raw = str(row[5] or "cron")
    trigger: ScheduledJobTriggerType = "manual" if trigger_raw == "manual" else "cron"
    return ScheduledJobRunRecord(
        id=int(row[0]),
        run_id=str(row[1]),
        job_code=str(row[2]),
        scope=scope,
        tenant_id=int(row[4]) if row[4] is not None else None,
        trigger_type=trigger,
        actor_user_id=int(row[6]) if row[6] is not None else None,
        actor_username=row[7],
        trigger_request_id=row[8],
        params_json=_json_loads(row[9]),
        context_json=_json_loads(row[10]),
        status=cast(ScheduledJobRunStatus, str(row[11])),
        summary=str(row[12] or ""),
        result_json=_json_loads(row[13]),
        error_text=row[14],
        started_at=row[15],
        finished_at=row[16],
        duration_ms=int(row[17]) if row[17] is not None else None,
    )


class ScheduledJobRunRepo:
    """任务执行历史：仅 INSERT / UPDATE 终态 / SELECT。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def ensure_schema(self) -> None:
        async with self._engine.begin() as conn:
            await execute_create_table_if_missing(conn, create_scheduled_job_run_sql())

    async def start_run(
        self,
        *,
        job_code: str,
        scope: ScheduledJobScope,
        tenant_id: int | None,
        trigger_type: ScheduledJobTriggerType,
        actor_user_id: int | None = None,
        actor_username: str | None = None,
        trigger_request_id: str | None = None,
        params: dict[str, Any] | None = None,
        context: dict[str, Any] | None = None,
        status: ScheduledJobRunStatus = "running",
        summary: str = "",
    ) -> str:
        run_id = str(uuid.uuid4())
        started = utc_now()
        finished = started if status != "running" else None
        duration = 0 if status != "running" else None
        sql = text(
            f"INSERT INTO {SYS_SCHEDULED_JOB_RUN} ("
            f"run_id, job_code, scope, tenant_id, trigger_type, actor_user_id, "
            f"actor_username, trigger_request_id, params_json, context_json, status, "
            f"summary, result_json, error_text, started_at, finished_at, duration_ms"
            f") VALUES ("
            f":run_id, :job_code, :scope, :tenant_id, :trigger_type, :actor_user_id, "
            f":actor_username, :trigger_request_id, CAST(:params_json AS JSON), "
            f"CAST(:context_json AS JSON), :status, :summary, NULL, NULL, "
            f":started_at, :finished_at, :duration_ms)"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "run_id": run_id,
                    "job_code": job_code,
                    "scope": scope,
                    "tenant_id": tenant_id,
                    "trigger_type": trigger_type,
                    "actor_user_id": actor_user_id,
                    "actor_username": actor_username,
                    "trigger_request_id": trigger_request_id,
                    "params_json": _json_dumps(params),
                    "context_json": _json_dumps(context),
                    "status": status,
                    "summary": summary[:_SUMMARY_MAX],
                    "started_at": started,
                    "finished_at": finished,
                    "duration_ms": duration,
                },
            )
        return run_id

    async def finish_run(
        self,
        run_id: str,
        *,
        status: ScheduledJobRunStatus,
        summary: str,
        result: dict[str, Any] | None = None,
        error_text: str | None = None,
    ) -> None:
        finished = utc_now()
        sql = text(
            f"UPDATE {SYS_SCHEDULED_JOB_RUN} SET status = :status, summary = :summary, "
            f"result_json = CAST(:result_json AS JSON), error_text = :error_text, "
            f"finished_at = :finished_at, "
            f"duration_ms = TIMESTAMPDIFF(MICROSECOND, started_at, :finished_at) DIV 1000 "
            f"WHERE run_id = :run_id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "run_id": run_id,
                    "status": status,
                    "summary": summary[:_SUMMARY_MAX],
                    "result_json": _json_dumps(result),
                    "error_text": truncate_text(error_text, _ERROR_MAX),
                    "finished_at": finished,
                },
            )

    async def get_by_run_id(self, run_id: str) -> ScheduledJobRunRecord | None:
        sql = text(f"{_SELECT} WHERE run_id = :run_id LIMIT 1")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"run_id": run_id})).fetchone()
        if row is None:
            return None
        return _row_to_record(row)

    async def list_runs(self, query: ScheduledJobRunQuery) -> PaginatedScheduledJobRuns:
        clauses: list[str] = []
        params: dict[str, Any] = {}
        if query.job_code:
            clauses.append("job_code = :job_code")
            params["job_code"] = query.job_code
        if query.tenant_id is not None:
            clauses.append("tenant_id = :tenant_id")
            params["tenant_id"] = query.tenant_id
        if query.status:
            clauses.append("status = :status")
            params["status"] = query.status
        if query.trigger_type:
            clauses.append("trigger_type = :trigger_type")
            params["trigger_type"] = query.trigger_type
        if query.trigger_request_id:
            clauses.append("trigger_request_id = :trigger_request_id")
            params["trigger_request_id"] = query.trigger_request_id
        if query.keyword and query.keyword.strip():
            clauses.append(
                "(job_code LIKE :kw OR run_id LIKE :kw OR summary LIKE :kw "
                "OR IFNULL(actor_username, '') LIKE :kw OR IFNULL(error_text, '') LIKE :kw)"
            )
            params["kw"] = f"%{query.keyword.strip()}%"
        if query.started_from is not None:
            clauses.append("started_at >= :started_from")
            params["started_from"] = query.started_from
        if query.started_to is not None:
            clauses.append("started_at <= :started_to")
            params["started_to"] = query.started_to
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        count_sql = text(f"SELECT COUNT(*) FROM {SYS_SCHEDULED_JOB_RUN} {where}")
        list_sql = text(
            f"{_SELECT} {where} ORDER BY started_at DESC, id DESC "
            f"LIMIT :limit OFFSET :offset"
        )
        params["limit"] = query.page_size
        params["offset"] = (query.page - 1) * query.page_size
        async with self._engine.connect() as conn:
            total = int((await conn.execute(count_sql, params)).scalar_one())
            rows = (await conn.execute(list_sql, params)).fetchall()
        return PaginatedScheduledJobRuns(
            items=[_row_to_record(row) for row in rows],
            total=total,
            page=query.page,
            page_size=query.page_size,
        )

    async def export_before(
        self, *, before: datetime, limit: int = 5000, after_id: int = 0
    ) -> list[ScheduledJobRunRecord]:
        sql = text(
            f"{_SELECT} WHERE started_at < :before AND id > :after_id "
            f"ORDER BY id ASC LIMIT :limit"
        )
        async with self._engine.connect() as conn:
            rows = (
                await conn.execute(
                    sql, {"before": before, "limit": limit, "after_id": after_id}
                )
            ).fetchall()
        return [_row_to_record(row) for row in rows]

    async def purge_before(self, *, before: datetime) -> int:
        sql = text(f"DELETE FROM {SYS_SCHEDULED_JOB_RUN} WHERE started_at < :before")
        async with self._engine.begin() as conn:
            result = await conn.execute(sql, {"before": before})
        return int(result.rowcount or 0)
