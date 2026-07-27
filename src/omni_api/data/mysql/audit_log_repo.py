"""审计日志 MySQL 仓储（append-only）。"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime
from collections.abc import Sequence
from typing import Any, cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_table import (
    SYS_AUDIT_OPERATION_LOGS,
    SYS_AUDIT_REQUEST_LOGS,
)
from omni_api.data.mysql.ddl_comment import AUDIT_LEVEL_ENUM, AUDIT_RESULT_ENUM, ID_PK, cmt, table_cmt
from omni_api.data.mysql.ddl_exec import execute_create_table_if_missing
from omni_api.data.mysql.list_sort import build_order_clause
from omni_api.data.mysql.utc import utc_now
from omni_api.schemas.audit_log import (
    AuditLevel,
    AuthStatus,
    OperationLogQuery,
    OperationLogRecord,
    OperationResult,
    PaginatedOperationLogs,
    PaginatedRequestLogs,
    RequestLogQuery,
    RequestLogRecord,
)

logger = logging.getLogger(__name__)

_audit_schema_ready = False
_audit_schema_lock = asyncio.Lock()


def clear_audit_schema_cache() -> None:
    """测试或手工重建表后清空进程内缓存。"""
    global _audit_schema_ready
    _audit_schema_ready = False

_REQUEST_SORT_FIELDS = {
    "id": "id",
    "occurred_at": "occurred_at",
    "level": "level",
    "duration_ms": "duration_ms",
    "method": "method",
    "path": "path",
    "status_code": "status_code",
    "user_id": "user_id",
    "username": "username",
}

_OPERATION_SORT_FIELDS = {
    "id": "id",
    "occurred_at": "occurred_at",
    "level": "level",
    "category": "category",
    "action": "action",
    "actor_id": "actor_id",
    "actor_username": "actor_username",
    "result": "result",
}

CREATE_AUDIT_TABLES_SQL = f"""
CREATE TABLE IF NOT EXISTS {SYS_AUDIT_REQUEST_LOGS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    request_id VARCHAR(36) NOT NULL{cmt("请求追踪ID")},
    occurred_at DATETIME(6) NOT NULL{cmt("事件发生时间(UTC)")},
    duration_ms INT NOT NULL{cmt("耗时(毫秒)")},
    method VARCHAR(10) NOT NULL{cmt("HTTP方法")},
    path VARCHAR(512) NOT NULL{cmt("请求路径")},
    query_string VARCHAR(1024) NULL{cmt("查询字符串")},
    status_code INT NOT NULL{cmt("HTTP状态码")},
    client_ip VARCHAR(45) NULL{cmt("客户端IP")},
    user_agent VARCHAR(512) NULL{cmt("User-Agent")},
    user_id BIGINT NULL{cmt("用户ID")},
    username VARCHAR(128) NULL{cmt("用户名")},
    tenant_id BIGINT NULL{cmt("租户ID")},
    level VARCHAR(16) NOT NULL{cmt(AUDIT_LEVEL_ENUM)},
    auth_status VARCHAR(32) NOT NULL{cmt("认证状态 ok已认证 anonymous匿名 rejected拒绝")},
    permission_code VARCHAR(128) NULL{cmt("权限编码")},
    error_detail VARCHAR(512) NULL{cmt("错误详情")},
    request_body_size INT NOT NULL DEFAULT 0{cmt("请求体大小(字节)")},
    response_body_size INT NULL{cmt("响应体大小(字节)")},
    UNIQUE KEY uq_audit_request_id (request_id),
    KEY idx_audit_req_occurred (occurred_at),
    KEY idx_audit_req_user (user_id),
    KEY idx_audit_req_tenant (tenant_id),
    KEY idx_audit_req_path (path(64)),
    KEY idx_audit_req_status (status_code)
){table_cmt("请求审计日志")};

CREATE TABLE IF NOT EXISTS {SYS_AUDIT_OPERATION_LOGS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    request_id VARCHAR(36) NULL{cmt("关联请求追踪ID")},
    occurred_at DATETIME(6) NOT NULL{cmt("事件发生时间(UTC)")},
    level VARCHAR(16) NOT NULL{cmt(AUDIT_LEVEL_ENUM)},
    category VARCHAR(64) NOT NULL{cmt("业务分类")},
    action VARCHAR(64) NOT NULL{cmt("操作动作")},
    actor_id BIGINT NULL{cmt("操作人用户ID")},
    actor_username VARCHAR(128) NULL{cmt("操作人用户名")},
    tenant_id BIGINT NULL{cmt("租户ID")},
    resource_type VARCHAR(64) NULL{cmt("资源类型")},
    resource_id VARCHAR(128) NULL{cmt("资源ID")},
    summary VARCHAR(512) NOT NULL{cmt("摘要")},
    before_json JSON NULL{cmt("变更前快照")},
    after_json JSON NULL{cmt("变更后快照")},
    result VARCHAR(16) NOT NULL{cmt(AUDIT_RESULT_ENUM)},
    error_detail VARCHAR(512) NULL{cmt("错误详情")},
    client_ip VARCHAR(45) NULL{cmt("客户端IP")},
    meta_json JSON NULL{cmt("扩展元数据")},
    KEY idx_audit_op_occurred (occurred_at),
    KEY idx_audit_op_actor (actor_id),
    KEY idx_audit_op_tenant (tenant_id),
    KEY idx_audit_op_cat_action (category, action),
    KEY idx_audit_op_request (request_id),
    KEY idx_audit_op_resource (resource_type, resource_id)
){table_cmt("操作审计日志")};
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


def _row_to_request(row: Sequence[Any]) -> RequestLogRecord:
    return RequestLogRecord(
        id=int(row[0]),
        request_id=str(row[1]),
        occurred_at=row[2],
        duration_ms=int(row[3]),
        method=str(row[4]),
        path=str(row[5]),
        query_string=row[6],
        status_code=int(row[7]),
        client_ip=row[8],
        user_agent=row[9],
        user_id=int(row[10]) if row[10] is not None else None,
        username=row[11],
        level=cast(AuditLevel, str(row[12])),
        auth_status=cast(AuthStatus, str(row[13])),
        permission_code=row[14],
        error_detail=row[15],
        request_body_size=int(row[16]),
        response_body_size=int(row[17]) if row[17] is not None else None,
    )


def _row_to_operation(row: Sequence[Any]) -> OperationLogRecord:
    return OperationLogRecord(
        id=int(row[0]),
        request_id=row[1],
        occurred_at=row[2],
        level=cast(AuditLevel, str(row[3])),
        category=str(row[4]),
        action=str(row[5]),
        actor_id=int(row[6]) if row[6] is not None else None,
        actor_username=row[7],
        resource_type=row[8],
        resource_id=row[9],
        summary=str(row[10]),
        before_json=_json_loads(row[11]),
        after_json=_json_loads(row[12]),
        result=cast(OperationResult, str(row[13])),
        error_detail=row[14],
        client_ip=row[15],
        meta_json=_json_loads(row[16]),
    )


_REQUEST_SELECT = f"""
SELECT id, request_id, occurred_at, duration_ms, method, path, query_string,
       status_code, client_ip, user_agent, user_id, username, level, auth_status,
       permission_code, error_detail, request_body_size, response_body_size
FROM {SYS_AUDIT_REQUEST_LOGS}
"""

_OPERATION_SELECT = f"""
SELECT id, request_id, occurred_at, level, category, action, actor_id, actor_username,
       resource_type, resource_id, summary, before_json, after_json, result,
       error_detail, client_ip, meta_json
FROM {SYS_AUDIT_OPERATION_LOGS}
"""


class AuditLogRepo:
    """请求日志与操作日志仓储（仅 INSERT / SELECT / DELETE 归档用）。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def ensure_schema(self) -> None:
        global _audit_schema_ready
        if _audit_schema_ready:
            return
        async with _audit_schema_lock:
            if _audit_schema_ready:
                return
            async with self._engine.begin() as conn:
                statements = [s.strip() for s in CREATE_AUDIT_TABLES_SQL.strip().split(";") if s.strip()]
                for stmt in statements:
                    await execute_create_table_if_missing(conn, stmt)
            _audit_schema_ready = True

    async def insert_request_log(self, data: dict[str, Any]) -> None:
        sql = text(
            f"""
            INSERT INTO {SYS_AUDIT_REQUEST_LOGS} (
                request_id, occurred_at, duration_ms, method, path, query_string,
                status_code, client_ip, user_agent, user_id, username, tenant_id, level,
                auth_status, permission_code, error_detail, request_body_size,
                response_body_size
            ) VALUES (
                :request_id, :occurred_at, :duration_ms, :method, :path, :query_string,
                :status_code, :client_ip, :user_agent, :user_id, :username, :tenant_id, :level,
                :auth_status, :permission_code, :error_detail, :request_body_size,
                :response_body_size
            )
            """
        )
        async with self._engine.begin() as conn:
            await conn.execute(sql, data)

    async def insert_operation_log(self, data: dict[str, Any]) -> None:
        sql = text(
            f"""
            INSERT INTO {SYS_AUDIT_OPERATION_LOGS} (
                request_id, occurred_at, level, category, action, actor_id,
                actor_username, tenant_id, resource_type, resource_id, summary, before_json,
                after_json, result, error_detail, client_ip, meta_json
            ) VALUES (
                :request_id, :occurred_at, :level, :category, :action, :actor_id,
                :actor_username, :tenant_id, :resource_type, :resource_id, :summary,
                CAST(:before_json AS JSON), CAST(:after_json AS JSON),
                :result, :error_detail, :client_ip, CAST(:meta_json AS JSON)
            )
            """
        )
        params = {
            **data,
            "before_json": _json_dumps(data.get("before_json")),
            "after_json": _json_dumps(data.get("after_json")),
            "meta_json": _json_dumps(data.get("meta_json")),
        }
        async with self._engine.begin() as conn:
            await conn.execute(sql, params)

    async def get_request_log(self, log_id: int) -> RequestLogRecord | None:
        sql = text(f"{_REQUEST_SELECT} WHERE id=:id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": log_id})).fetchone()
        return _row_to_request(row) if row else None

    async def get_operation_log(self, log_id: int) -> OperationLogRecord | None:
        sql = text(f"{_OPERATION_SELECT} WHERE id=:id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": log_id})).fetchone()
        return _row_to_operation(row) if row else None

    async def list_request_logs(
        self,
        q: RequestLogQuery,
        *,
        scope_clause: str = "",
        scope_params: dict[str, object] | None = None,
    ) -> PaginatedRequestLogs:
        where, params = self._build_request_filters(q)
        if scope_clause:
            where = f"{where} AND {scope_clause}"
            params.update(scope_params or {})
        order = build_order_clause(
            q.sort_by,
            q.sort_order,
            _REQUEST_SORT_FIELDS,
            default_field="occurred_at",
            default_order="desc",
        )
        count_sql = text(f"SELECT COUNT(*) FROM {SYS_AUDIT_REQUEST_LOGS} WHERE {where}")
        list_sql = text(
            f"{_REQUEST_SELECT} WHERE {where}{order} LIMIT :limit OFFSET :offset"
        )
        offset = (q.page - 1) * q.page_size
        params["limit"] = q.page_size
        params["offset"] = offset
        async with self._engine.connect() as conn:
            total = int((await conn.execute(count_sql, params)).scalar_one())
            rows = (await conn.execute(list_sql, params)).fetchall()
        return PaginatedRequestLogs(
            items=[_row_to_request(r) for r in rows],
            total=total,
            page=q.page,
            page_size=q.page_size,
        )

    async def list_operation_logs(
        self,
        q: OperationLogQuery,
        *,
        scope_clause: str = "",
        scope_params: dict[str, object] | None = None,
    ) -> PaginatedOperationLogs:
        where, params = self._build_operation_filters(q)
        if scope_clause:
            where = f"{where} AND {scope_clause}"
            params.update(scope_params or {})
        order = build_order_clause(
            q.sort_by,
            q.sort_order,
            _OPERATION_SORT_FIELDS,
            default_field="occurred_at",
            default_order="desc",
        )
        count_sql = text(f"SELECT COUNT(*) FROM {SYS_AUDIT_OPERATION_LOGS} WHERE {where}")
        list_sql = text(
            f"{_OPERATION_SELECT} WHERE {where}{order} LIMIT :limit OFFSET :offset"
        )
        offset = (q.page - 1) * q.page_size
        params["limit"] = q.page_size
        params["offset"] = offset
        async with self._engine.connect() as conn:
            total = int((await conn.execute(count_sql, params)).scalar_one())
            rows = (await conn.execute(list_sql, params)).fetchall()
        return PaginatedOperationLogs(
            items=[_row_to_operation(r) for r in rows],
            total=total,
            page=q.page,
            page_size=q.page_size,
        )

    async def fetch_requests_before(
        self, before: datetime, *, limit: int = 5000, after_id: int = 0
    ) -> list[RequestLogRecord]:
        sql = text(
            f"{_REQUEST_SELECT} WHERE occurred_at < :before AND id > :after_id "
            "ORDER BY id ASC LIMIT :limit"
        )
        async with self._engine.connect() as conn:
            rows = (
                await conn.execute(
                    sql, {"before": before, "after_id": after_id, "limit": limit}
                )
            ).fetchall()
        return [_row_to_request(r) for r in rows]

    async def fetch_operations_before(
        self, before: datetime, *, limit: int = 5000, after_id: int = 0
    ) -> list[OperationLogRecord]:
        sql = text(
            f"{_OPERATION_SELECT} WHERE occurred_at < :before AND id > :after_id "
            "ORDER BY id ASC LIMIT :limit"
        )
        async with self._engine.connect() as conn:
            rows = (
                await conn.execute(
                    sql, {"before": before, "after_id": after_id, "limit": limit}
                )
            ).fetchall()
        return [_row_to_operation(r) for r in rows]

    async def delete_requests_before(self, before: datetime) -> int:
        sql = text(f"DELETE FROM {SYS_AUDIT_REQUEST_LOGS} WHERE occurred_at < :before")
        async with self._engine.begin() as conn:
            result = await conn.execute(sql, {"before": before})
        return int(result.rowcount)

    async def delete_operations_before(self, before: datetime) -> int:
        sql = text(f"DELETE FROM {SYS_AUDIT_OPERATION_LOGS} WHERE occurred_at < :before")
        async with self._engine.begin() as conn:
            result = await conn.execute(sql, {"before": before})
        return int(result.rowcount)

    def _build_request_filters(self, q: RequestLogQuery) -> tuple[str, dict[str, Any]]:
        clauses = ["1=1"]
        params: dict[str, Any] = {}
        if q.occurred_from is not None:
            clauses.append("occurred_at >= :occurred_from")
            params["occurred_from"] = q.occurred_from
        if q.occurred_to is not None:
            clauses.append("occurred_at <= :occurred_to")
            params["occurred_to"] = q.occurred_to
        if q.level is not None:
            clauses.append("level = :level")
            params["level"] = q.level
        if q.user_id is not None:
            clauses.append("user_id = :user_id")
            params["user_id"] = q.user_id
        if q.status_code is not None:
            clauses.append("status_code = :status_code")
            params["status_code"] = q.status_code
        if q.request_id:
            clauses.append("request_id = :request_id")
            params["request_id"] = q.request_id
        if q.keyword:
            clauses.append(
                "(path LIKE :kw OR username LIKE :kw OR error_detail LIKE :kw)"
            )
            params["kw"] = f"%{q.keyword}%"
        return " AND ".join(clauses), params

    def _build_operation_filters(self, q: OperationLogQuery) -> tuple[str, dict[str, Any]]:
        clauses = ["1=1"]
        params: dict[str, Any] = {}
        if q.occurred_from is not None:
            clauses.append("occurred_at >= :occurred_from")
            params["occurred_from"] = q.occurred_from
        if q.occurred_to is not None:
            clauses.append("occurred_at <= :occurred_to")
            params["occurred_to"] = q.occurred_to
        if q.level is not None:
            clauses.append("level = :level")
            params["level"] = q.level
        if q.actor_id is not None:
            clauses.append("actor_id = :actor_id")
            params["actor_id"] = q.actor_id
        if q.category:
            clauses.append("category = :category")
            params["category"] = q.category
        if q.action:
            clauses.append("action = :action")
            params["action"] = q.action
        if q.request_id:
            clauses.append("request_id = :request_id")
            params["request_id"] = q.request_id
        if q.keyword:
            clauses.append(
                "(summary LIKE :kw OR actor_username LIKE :kw OR resource_id LIKE :kw "
                "OR error_detail LIKE :kw)"
            )
            params["kw"] = f"%{q.keyword}%"
        return " AND ".join(clauses), params

    @staticmethod
    def date_key(dt: datetime) -> str:
        return dt.strftime("%Y-%m-%d")

    @staticmethod
    def cutoff_from_retention(retention_days: int) -> datetime:
        from datetime import timedelta

        return utc_now() - timedelta(days=retention_days)
