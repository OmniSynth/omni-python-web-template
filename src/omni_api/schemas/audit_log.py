"""审计日志 DTO。"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.utc_datetime import UtcDateTime

AuditLevel = Literal["system", "business"]
AuthStatus = Literal["anonymous", "authenticated", "auth_failed"]
OperationResult = Literal["success", "failure"]


class RequestLogRecord(BaseModel):
    id: int
    request_id: str
    occurred_at: UtcDateTime
    duration_ms: int
    method: str
    path: str
    query_string: str | None = None
    status_code: int
    client_ip: str | None = None
    user_agent: str | None = None
    user_id: int | None = None
    username: str | None = None
    level: AuditLevel
    auth_status: AuthStatus
    permission_code: str | None = None
    error_detail: str | None = None
    request_body_size: int = 0
    response_body_size: int | None = None


class OperationLogRecord(BaseModel):
    id: int
    request_id: str | None = None
    occurred_at: UtcDateTime
    level: AuditLevel
    category: str
    action: str
    actor_id: int | None = None
    actor_username: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    summary: str
    before_json: dict[str, Any] | None = None
    after_json: dict[str, Any] | None = None
    result: OperationResult
    error_detail: str | None = None
    client_ip: str | None = None
    meta_json: dict[str, Any] | None = None


class RequestLogQuery(BaseModel):
    occurred_from: UtcDateTime | None = None
    occurred_to: UtcDateTime | None = None
    level: AuditLevel | None = None
    user_id: int | None = None
    status_code: int | None = None
    request_id: str | None = None
    keyword: str | None = None
    sort_by: str | None = None
    sort_order: SortOrder | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class OperationLogQuery(BaseModel):
    occurred_from: UtcDateTime | None = None
    occurred_to: UtcDateTime | None = None
    level: AuditLevel | None = None
    actor_id: int | None = None
    category: str | None = None
    action: str | None = None
    request_id: str | None = None
    keyword: str | None = None
    sort_by: str | None = None
    sort_order: SortOrder | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedRequestLogs(BaseModel):
    items: list[RequestLogRecord]
    total: int
    page: int
    page_size: int


class PaginatedOperationLogs(BaseModel):
    items: list[OperationLogRecord]
    total: int
    page: int
    page_size: int


SqlTier = Literal["oltp", "polling", "data", "artifact"]
SqlSeverity = Literal["slow", "critical"]


class SlowSqlLogRecord(BaseModel):
    id: int
    occurred_at: UtcDateTime
    request_id: str | None = None
    http_method: str | None = None
    http_path: str | None = None
    user_id: int | None = None
    username: str | None = None
    tenant_id: int | None = None
    tier: SqlTier
    severity: SqlSeverity
    duration_ms: int
    threshold_ms: int
    sql_fingerprint: str
    sql_text: str
    rows_affected: int | None = None
    meta_json: dict[str, Any] | None = None


class SlowSqlLogQuery(BaseModel):
    occurred_from: UtcDateTime | None = None
    occurred_to: UtcDateTime | None = None
    tier: SqlTier | None = None
    severity: SqlSeverity | None = None
    request_id: str | None = None
    keyword: str | None = None
    sort_by: str | None = None
    sort_order: SortOrder | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedSlowSqlLogs(BaseModel):
    items: list[SlowSqlLogRecord]
    total: int
    page: int
    page_size: int


class AuditExportRequest(BaseModel):
    occurred_from: UtcDateTime
    occurred_to: UtcDateTime
    types: Literal["requests", "operations", "slow_sql", "all"] = "all"
    purge: bool = False


class AuditExportResult(BaseModel):
    request_files: list[str] = Field(default_factory=list)
    operation_files: list[str] = Field(default_factory=list)
    slow_sql_files: list[str] = Field(default_factory=list)
    request_count: int = 0
    operation_count: int = 0
    slow_sql_count: int = 0
    purged_request_count: int = 0
    purged_operation_count: int = 0
    purged_slow_sql_count: int = 0
