"""审计日志服务：写入、查询、冷归档。"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from omni_api.audit.classifier import classify_request_level
from omni_api.audit.events import format_summary
from omni_api.audit.mask import mask_model, truncate_text
from omni_api.audit.sql_explain import build_explain_meta
from omni_api.config.settings import AuditSettings, get_settings
from omni_api.data.mysql.actor import get_actor_id, get_actor_username
from omni_api.data.mysql.audit_log_repo import AuditLogRepo
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.request_context import (
    get_client_ip,
    get_permission_denied_code,
    get_request_id,
    get_user_agent,
)
from omni_api.data.mysql.slow_sql_repo import SlowSqlLogRepo
from omni_api.data.mysql.sql_audit_listener import SlowSqlEvent
from omni_api.data.mysql.tenant_context import get_tenant_id
from omni_api.data.mysql.utc import naive_utc, utc_now
from omni_api.schemas.audit_log import (
    AuditExportRequest,
    AuditExportResult,
    AuditLevel,
    AuthStatus,
    OperationLogQuery,
    OperationLogRecord,
    OperationResult,
    PaginatedOperationLogs,
    PaginatedRequestLogs,
    PaginatedSlowSqlLogs,
    RequestLogQuery,
    RequestLogRecord,
    SlowSqlLogQuery,
    SlowSqlLogRecord,
)

logger = logging.getLogger(__name__)


class AuditService:
    """请求日志与操作日志编排。"""

    def __init__(
        self,
        repo: AuditLogRepo | None = None,
        slow_sql_repo: SlowSqlLogRepo | None = None,
        settings: AuditSettings | None = None,
    ) -> None:
        engine = mysql_engine()
        self._engine = engine
        self._repo = repo or AuditLogRepo(engine)
        self._slow_sql_repo = slow_sql_repo or SlowSqlLogRepo(engine)
        self._cfg = settings or get_settings().audit

    async def ensure_schema(self) -> None:
        await self._repo.ensure_schema()
        await self._slow_sql_repo.ensure_schema()

    async def record_request(
        self,
        *,
        request_id: str,
        method: str,
        path: str,
        query_string: str | None,
        status_code: int,
        duration_ms: int,
        user_id: int | None = None,
        username: str | None = None,
        tenant_id: int | None = None,
        auth_status: AuthStatus = "anonymous",
        client_ip: str | None = None,
        user_agent: str | None = None,
        permission_code: str | None = None,
        error_detail: str | None = None,
        request_body_size: int = 0,
        response_body_size: int | None = None,
    ) -> None:
        resolved_permission = permission_code
        if resolved_permission is None and status_code == 403:
            resolved_permission = get_permission_denied_code()
        level = classify_request_level(path)
        data = {
            "request_id": request_id,
            "occurred_at": utc_now(),
            "duration_ms": duration_ms,
            "method": method[:10],
            "path": path[:512],
            "query_string": truncate_text(query_string, 1024) if query_string else None,
            "status_code": status_code,
            "client_ip": client_ip if client_ip is not None else get_client_ip(),
            "user_agent": truncate_text(
                user_agent if user_agent is not None else get_user_agent(), 512
            ),
            "user_id": user_id,
            "username": username,
            "tenant_id": tenant_id if tenant_id is not None else get_tenant_id(),
            "level": level,
            "auth_status": auth_status,
            "permission_code": resolved_permission,
            "error_detail": truncate_text(error_detail),
            "request_body_size": request_body_size,
            "response_body_size": response_body_size,
        }
        try:
            await self._repo.insert_request_log(data)
        except Exception:
            logger.exception("写入请求审计日志失败 request_id=%s", request_id)

    async def record_operation(
        self,
        *,
        category: str,
        action: str,
        summary: str | None = None,
        level: AuditLevel | None = None,
        actor_id: int | None = None,
        actor_username: str | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        before: Any = None,
        after: Any = None,
        result: OperationResult = "success",
        error_detail: str | None = None,
        request_id: str | None = None,
        meta_json: dict[str, Any] | None = None,
        **summary_kwargs: str,
    ) -> None:
        if level is None:
            level = "system" if category in ("auth", "user", "role", "audit") else "business"
        if summary is None:
            summary = format_summary(category, action, **summary_kwargs)
        if actor_id is None:
            actor_id = get_actor_id()
        if actor_username is None:
            actor_username = get_actor_username()
        data = {
            "request_id": request_id or get_request_id(),
            "occurred_at": utc_now(),
            "level": level,
            "category": category,
            "action": action,
            "actor_id": actor_id,
            "actor_username": actor_username,
            "tenant_id": get_tenant_id(),
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id is not None else None,
            "summary": truncate_text(summary, 512) or f"{category}.{action}",
            "before_json": mask_model(before),
            "after_json": mask_model(after),
            "result": result,
            "error_detail": truncate_text(error_detail),
            "client_ip": get_client_ip(),
            "meta_json": meta_json,
        }
        try:
            await self._repo.insert_operation_log(data)
        except Exception:
            logger.exception(
                "写入操作审计日志失败 category=%s action=%s", category, action
            )

    async def record_slow_sql(self, event: SlowSqlEvent) -> None:
        meta_json = await build_explain_meta(
            self._engine,
            event.sql_text,
            enabled=self._cfg.slow_sql_explain_enabled,
            executemany=event.executemany,
        )
        data = {
            "occurred_at": utc_now(),
            "request_id": event.request_id,
            "http_method": (event.http_method or "")[:10] or None,
            "http_path": (event.http_path or "")[:512] or None,
            "user_id": event.user_id,
            "username": event.username,
            "tenant_id": event.tenant_id,
            "tier": event.tier,
            "severity": event.severity,
            "duration_ms": event.duration_ms,
            "threshold_ms": event.threshold_ms,
            "sql_fingerprint": event.sql_fingerprint,
            "sql_text": event.sql_text,
            "rows_affected": event.rows_affected,
            "meta_json": meta_json,
        }
        try:
            await self._slow_sql_repo.insert(data)
        except Exception:
            logger.exception(
                "写入慢 SQL 审计失败 fingerprint=%s", event.sql_fingerprint
            )

    async def list_requests(self, q: RequestLogQuery) -> PaginatedRequestLogs:
        return await self._repo.list_request_logs(q, scope_clause="", scope_params={})

    async def list_operations(self, q: OperationLogQuery) -> PaginatedOperationLogs:
        return await self._repo.list_operation_logs(q, scope_clause="", scope_params={})

    async def get_request(self, log_id: int) -> RequestLogRecord | None:
        return await self._repo.get_request_log(log_id)

    async def get_operation(self, log_id: int) -> OperationLogRecord | None:
        return await self._repo.get_operation_log(log_id)

    async def list_slow_sql(self, q: SlowSqlLogQuery) -> PaginatedSlowSqlLogs:
        return await self._slow_sql_repo.list(q)

    async def get_slow_sql(self, log_id: int) -> SlowSqlLogRecord | None:
        return await self._slow_sql_repo.get(log_id)

    def archive_root(self) -> Path:
        root = Path(self._cfg.archive_dir)
        if not root.is_absolute():
            root = get_settings().project_root / root
        return root

    async def export_and_purge(self, body: AuditExportRequest) -> AuditExportResult:
        """导出指定时间范围内的日志为 JSONL，可选 purge。"""
        occurred_from = naive_utc(body.occurred_from)
        occurred_to = naive_utc(body.occurred_to)
        batch = self._cfg.export_batch_size
        root = self.archive_root()
        result = AuditExportResult()

        if body.types in ("requests", "all"):
            req_files, req_count = await self._export_requests(
                root, occurred_from, occurred_to, batch
            )
            result.request_files = req_files
            result.request_count = req_count
            if body.purge and req_count > 0:
                result.purged_request_count = await self._repo.delete_requests_before(
                    occurred_to
                )

        if body.types in ("operations", "all"):
            op_files, op_count = await self._export_operations(
                root, occurred_from, occurred_to, batch
            )
            result.operation_files = op_files
            result.operation_count = op_count
            if body.purge and op_count > 0:
                result.purged_operation_count = await self._repo.delete_operations_before(
                    occurred_to
                )

        if body.types in ("slow_sql", "all"):
            sql_files, sql_count = await self._export_slow_sql(
                root, occurred_from, occurred_to, batch
            )
            result.slow_sql_files = sql_files
            result.slow_sql_count = sql_count
            if body.purge and sql_count > 0:
                result.purged_slow_sql_count = await self._slow_sql_repo.delete_before(
                    occurred_to
                )

        return result

    async def export_retention_cutoff(self, *, purge: bool = True) -> AuditExportResult:
        """按 retention_days 导出并清理热数据。"""
        cutoff = self._repo.cutoff_from_retention(self._cfg.retention_days)
        epoch = datetime(1970, 1, 1)
        return await self.export_and_purge(
            AuditExportRequest(
                occurred_from=epoch,
                occurred_to=cutoff,
                types="all",
                purge=purge,
            )
        )

    async def _export_requests(
        self,
        root: Path,
        occurred_from: datetime,
        occurred_to: datetime,
        batch: int,
    ) -> tuple[list[str], int]:
        out_dir = root / "requests"
        out_dir.mkdir(parents=True, exist_ok=True)
        files: list[str] = []
        total = 0
        after_id = 0
        current_date: str | None = None
        handle = None
        try:
            while True:
                rows = await self._repo.fetch_requests_before(
                    occurred_to, limit=batch, after_id=after_id
                )
                if not rows:
                    break
                for row in rows:
                    if row.occurred_at < occurred_from:
                        continue
                    day = AuditLogRepo.date_key(row.occurred_at)
                    if day != current_date:
                        if handle is not None:
                            handle.close()
                        path = out_dir / f"{day}.jsonl"
                        files.append(str(path))
                        handle = path.open("a", encoding="utf-8")
                        current_date = day
                    assert handle is not None
                    handle.write(
                        json.dumps(row.model_dump(mode="json"), ensure_ascii=False)
                        + "\n"
                    )
                    total += 1
                    after_id = row.id
                if len(rows) < batch:
                    break
        finally:
            if handle is not None:
                handle.close()
        return list(dict.fromkeys(files)), total

    async def _export_operations(
        self,
        root: Path,
        occurred_from: datetime,
        occurred_to: datetime,
        batch: int,
    ) -> tuple[list[str], int]:
        out_dir = root / "operations"
        out_dir.mkdir(parents=True, exist_ok=True)
        files: list[str] = []
        total = 0
        after_id = 0
        current_date: str | None = None
        handle = None
        try:
            while True:
                rows = await self._repo.fetch_operations_before(
                    occurred_to, limit=batch, after_id=after_id
                )
                if not rows:
                    break
                for row in rows:
                    if row.occurred_at < occurred_from:
                        continue
                    day = AuditLogRepo.date_key(row.occurred_at)
                    if day != current_date:
                        if handle is not None:
                            handle.close()
                        path = out_dir / f"{day}.jsonl"
                        files.append(str(path))
                        handle = path.open("a", encoding="utf-8")
                        current_date = day
                    assert handle is not None
                    handle.write(
                        json.dumps(row.model_dump(mode="json"), ensure_ascii=False)
                        + "\n"
                    )
                    total += 1
                    after_id = row.id
                if len(rows) < batch:
                    break
        finally:
            if handle is not None:
                handle.close()
        return list(dict.fromkeys(files)), total

    async def _export_slow_sql(
        self,
        root: Path,
        occurred_from: datetime,
        occurred_to: datetime,
        batch: int,
    ) -> tuple[list[str], int]:
        out_dir = root / "slow-sql"
        out_dir.mkdir(parents=True, exist_ok=True)
        files: list[str] = []
        total = 0
        after_id = 0
        current_date: str | None = None
        handle = None
        try:
            while True:
                rows = await self._slow_sql_repo.fetch_before(
                    occurred_to, limit=batch, after_id=after_id
                )
                if not rows:
                    break
                for row in rows:
                    if row.occurred_at < occurred_from:
                        continue
                    day = SlowSqlLogRepo.date_key(row.occurred_at)
                    if day != current_date:
                        if handle is not None:
                            handle.close()
                        path = out_dir / f"{day}.jsonl"
                        files.append(str(path))
                        handle = path.open("a", encoding="utf-8")
                        current_date = day
                    assert handle is not None
                    handle.write(
                        json.dumps(row.model_dump(mode="json"), ensure_ascii=False)
                        + "\n"
                    )
                    total += 1
                    after_id = row.id
                if len(rows) < batch:
                    break
        finally:
            if handle is not None:
                handle.close()
        return list(dict.fromkeys(files)), total
