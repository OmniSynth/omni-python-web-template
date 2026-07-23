"""慢 SQL 审计日志 MySQL 仓储（append-only）。"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Sequence
from datetime import datetime
from typing import Any, cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_table import SYS_AUDIT_SLOW_SQL_LOGS
from omni_api.data.mysql.ddl_comment import AUDIT_LEVEL_ENUM, ID_PK, cmt
from omni_api.data.mysql.ddl_exec import execute_create_table_if_missing
from omni_api.data.mysql.list_sort import build_order_clause
from omni_api.data.mysql.sql_audit_listener import bump_sql_audit_depth, reset_sql_audit_depth
from omni_api.schemas.audit_log import (
    PaginatedSlowSqlLogs,
    SlowSqlLogQuery,
    SlowSqlLogRecord,
    SqlSeverity,
    SqlTier,
)

logger = logging.getLogger(__name__)

_slow_sql_schema_ready = False
_slow_sql_schema_lock = asyncio.Lock()


def clear_slow_sql_schema_cache() -> None:
    """测试或手工重建表后清空进程内缓存。"""
    global _slow_sql_schema_ready
    _slow_sql_schema_ready = False

_SLOW_SQL_SORT_FIELDS = {
    "id": "id",
    "occurred_at": "occurred_at",
    "duration_ms": "duration_ms",
    "tier": "tier",
    "severity": "severity",
}

CREATE_SLOW_SQL_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS {SYS_AUDIT_SLOW_SQL_LOGS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    occurred_at DATETIME(6) NOT NULL{cmt("事件发生时间(UTC)")},
    request_id VARCHAR(36) NULL{cmt("关联请求追踪ID")},
    http_method VARCHAR(10) NULL{cmt("HTTP方法")},
    http_path VARCHAR(512) NULL{cmt("请求路径")},
    user_id BIGINT NULL{cmt("用户ID")},
    username VARCHAR(128) NULL{cmt("用户名")},
    tenant_id BIGINT NULL{cmt("租户ID")},
    tier VARCHAR(16) NOT NULL{cmt("SQL层级 orm raw")},
    severity VARCHAR(16) NOT NULL{cmt(AUDIT_LEVEL_ENUM)},
    duration_ms INT NOT NULL{cmt("总耗时(毫秒)")},
    threshold_ms INT NOT NULL{cmt("慢查询阈值(毫秒)")},
    sql_fingerprint VARCHAR(32) NOT NULL{cmt("SQL指纹")},
    sql_text TEXT NOT NULL{cmt("SQL文本")},
    rows_affected INT NULL{cmt("影响行数")},
    meta_json JSON NULL{cmt("扩展元数据")},
    KEY idx_slow_sql_occurred (occurred_at),
    KEY idx_slow_sql_tier (tier),
    KEY idx_slow_sql_severity (severity),
    KEY idx_slow_sql_request (request_id),
    KEY idx_slow_sql_fingerprint (sql_fingerprint),
    KEY idx_slow_sql_duration (duration_ms)
);
"""

_SLOW_SQL_SELECT = f"""
SELECT id, occurred_at, request_id, http_method, http_path, user_id, username,
       tenant_id, tier, severity, duration_ms, threshold_ms,
       sql_fingerprint, sql_text, rows_affected, meta_json
FROM {SYS_AUDIT_SLOW_SQL_LOGS}
"""


def _json_dumps(obj: dict[str, Any] | None) -> str | None:
    if obj is None:
        return None
    return json.dumps(obj, ensure_ascii=False, default=str)


def _json_loads(raw: Any) -> dict[str, Any] | None:
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        return json.loads(raw)
    return None


def _row_to_slow_sql(row: Sequence[Any]) -> SlowSqlLogRecord:
    return SlowSqlLogRecord(
        id=int(row[0]),
        occurred_at=row[1],
        request_id=row[2],
        http_method=row[3],
        http_path=row[4],
        user_id=int(row[5]) if row[5] is not None else None,
        username=row[6],
        tenant_id=int(row[7]) if row[7] is not None else None,
        tier=cast(SqlTier, str(row[8])),
        severity=cast(SqlSeverity, str(row[9])),
        duration_ms=int(row[10]),
        threshold_ms=int(row[11]),
        sql_fingerprint=str(row[12]),
        sql_text=str(row[13]),
        rows_affected=int(row[14]) if row[14] is not None else None,
        meta_json=_json_loads(row[15]),
    )


class SlowSqlLogRepo:
    """慢 SQL 日志仓储。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def ensure_schema(self) -> None:
        global _slow_sql_schema_ready
        if _slow_sql_schema_ready:
            return
        async with _slow_sql_schema_lock:
            if _slow_sql_schema_ready:
                return
            async with self._engine.begin() as conn:
                ddl = CREATE_SLOW_SQL_TABLE_SQL.strip()
                await execute_create_table_if_missing(conn, ddl)
            _slow_sql_schema_ready = True

    async def insert(self, data: dict[str, Any]) -> None:
        depth_token = bump_sql_audit_depth()
        sql = text(
            f"""
            INSERT INTO {SYS_AUDIT_SLOW_SQL_LOGS} (
                occurred_at, request_id, http_method, http_path, user_id, username,
                tenant_id, tier, severity, duration_ms, threshold_ms,
                sql_fingerprint, sql_text, rows_affected, meta_json
            ) VALUES (
                :occurred_at, :request_id, :http_method, :http_path, :user_id, :username,
                :tenant_id, :tier, :severity, :duration_ms, :threshold_ms,
                :sql_fingerprint, :sql_text, :rows_affected, CAST(:meta_json AS JSON)
            )
            """
        )
        params = {**data, "meta_json": _json_dumps(data.get("meta_json"))}
        try:
            async with self._engine.begin() as conn:
                await conn.execute(sql, params)
        finally:
            reset_sql_audit_depth(depth_token)

    async def get(self, log_id: int) -> SlowSqlLogRecord | None:
        sql = text(f"{_SLOW_SQL_SELECT} WHERE id=:id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": log_id})).fetchone()
        return _row_to_slow_sql(row) if row else None

    async def list(self, q: SlowSqlLogQuery) -> PaginatedSlowSqlLogs:
        where, params = self._build_filters(q)
        order = build_order_clause(
            q.sort_by,
            q.sort_order,
            _SLOW_SQL_SORT_FIELDS,
            default_field="occurred_at",
            default_order="desc",
        )
        count_sql = text(f"SELECT COUNT(*) FROM {SYS_AUDIT_SLOW_SQL_LOGS} WHERE {where}")
        list_sql = text(
            f"{_SLOW_SQL_SELECT} WHERE {where}{order} LIMIT :limit OFFSET :offset"
        )
        offset = (q.page - 1) * q.page_size
        params["limit"] = q.page_size
        params["offset"] = offset
        async with self._engine.connect() as conn:
            total = int((await conn.execute(count_sql, params)).scalar_one())
            rows = (await conn.execute(list_sql, params)).fetchall()
        return PaginatedSlowSqlLogs(
            items=[_row_to_slow_sql(r) for r in rows],
            total=total,
            page=q.page,
            page_size=q.page_size,
        )

    async def fetch_before(
        self, before: datetime, *, limit: int = 5000, after_id: int = 0
    ) -> list[SlowSqlLogRecord]:
        sql = text(
            f"{_SLOW_SQL_SELECT} WHERE occurred_at < :before AND id > :after_id "
            "ORDER BY id ASC LIMIT :limit"
        )
        async with self._engine.connect() as conn:
            rows = (
                await conn.execute(
                    sql, {"before": before, "after_id": after_id, "limit": limit}
                )
            ).fetchall()
        return [_row_to_slow_sql(r) for r in rows]

    async def delete_before(self, before: datetime) -> int:
        sql = text(f"DELETE FROM {SYS_AUDIT_SLOW_SQL_LOGS} WHERE occurred_at < :before")
        async with self._engine.begin() as conn:
            result = await conn.execute(sql, {"before": before})
        return int(result.rowcount)

    def _build_filters(self, q: SlowSqlLogQuery) -> tuple[str, dict[str, Any]]:
        clauses = ["1=1"]
        params: dict[str, Any] = {}
        if q.occurred_from is not None:
            clauses.append("occurred_at >= :occurred_from")
            params["occurred_from"] = q.occurred_from
        if q.occurred_to is not None:
            clauses.append("occurred_at <= :occurred_to")
            params["occurred_to"] = q.occurred_to
        if q.tier is not None:
            clauses.append("tier = :tier")
            params["tier"] = q.tier
        if q.severity is not None:
            clauses.append("severity = :severity")
            params["severity"] = q.severity
        if q.request_id:
            clauses.append("request_id = :request_id")
            params["request_id"] = q.request_id
        if q.keyword:
            clauses.append(
                "(http_path LIKE :kw OR sql_text LIKE :kw OR username LIKE :kw "
                "OR sql_fingerprint LIKE :kw)"
            )
            params["kw"] = f"%{q.keyword}%"
        return " AND ".join(clauses), params

    @staticmethod
    def date_key(dt: datetime) -> str:
        return dt.strftime("%Y-%m-%d")
