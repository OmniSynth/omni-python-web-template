"""SQLAlchemy 语句级慢 SQL 审计监听器。"""

from __future__ import annotations

import asyncio
import logging
import time
from contextvars import ContextVar, Token
from dataclasses import dataclass
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.audit.sql_text import render_audit_sql, sql_fingerprint
from omni_api.audit.sql_tier import (
    SqlSeverity,
    SqlTier,
    classify_severity,
    classify_sql_tier,
    threshold_ms_for_severity,
)
from omni_api.config.settings import get_settings
from omni_api.data.mysql.actor import get_actor_id, get_actor_username
from omni_api.data.mysql.request_context import (
    get_http_method,
    get_http_path,
    get_request_id,
)
from omni_api.data.mysql.tenant_context import get_tenant_id

logger = logging.getLogger(__name__)

_TIMING_KEY = "_sql_audit_start"
_PARAMS_KEY = "_sql_audit_params"
_EXECUTEMANY_KEY = "_sql_audit_executemany"
_AUDIT_TABLE_MARKER = "t_sys_audit_"
_INTERNAL_SQL_MARKERS = (
    "information_schema.",
    "mysql.",
    "sys.",
)
_INTERNAL_SQL_PREFIXES = (
    "CREATE TABLE IF NOT EXISTS",
    "ALTER TABLE",
    "DROP TABLE",
)
_listeners_attached = False

_sql_audit_depth: ContextVar[int] = ContextVar("sql_audit_depth", default=0)

_queue: asyncio.Queue[SlowSqlEvent] | None = None
_worker_task: asyncio.Task[None] | None = None


def get_sql_audit_depth() -> int:
    return _sql_audit_depth.get()


def bump_sql_audit_depth() -> Token:
    return _sql_audit_depth.set(_sql_audit_depth.get() + 1)


def reset_sql_audit_depth(token: Token) -> None:
    _sql_audit_depth.reset(token)


@dataclass(frozen=True)
class SlowSqlEvent:
    request_id: str | None
    http_method: str | None
    http_path: str | None
    user_id: int | None
    username: str | None
    tenant_id: int | None
    tier: SqlTier
    severity: SqlSeverity
    duration_ms: int
    threshold_ms: int
    sql_fingerprint: str
    sql_text: str
    rows_affected: int | None
    executemany: bool = False


def _should_skip(statement: str) -> bool:
    if get_sql_audit_depth() > 0:
        return True
    lower = statement.lower()
    if _AUDIT_TABLE_MARKER in lower:
        return True
    if any(marker in lower for marker in _INTERNAL_SQL_MARKERS):
        return True
    stripped = statement.lstrip().upper()
    if any(stripped.startswith(prefix) for prefix in _INTERNAL_SQL_PREFIXES):
        return True
    return False


def _schedule_enqueue(event: SlowSqlEvent) -> None:
    q = _queue
    if q is None:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return

    def _put() -> None:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            logger.warning("慢 SQL 审计队列已满，丢弃一条记录")

    loop.call_soon(_put)


def _finalize(
    conn: Any,
    cursor: Any,
    statement: str,
    *,
    parameters: Any = None,
    executemany: bool = False,
    failed: bool = False,
) -> None:
    cfg = get_settings().audit
    if not cfg.slow_sql_enabled:
        return
    if _should_skip(statement):
        return

    started = conn.info.pop(_TIMING_KEY, None)
    if started is None:
        conn.info.pop(_PARAMS_KEY, None)
        conn.info.pop(_EXECUTEMANY_KEY, None)
        return

    stored_parameters = conn.info.pop(_PARAMS_KEY, None)
    exec_many = executemany or bool(conn.info.pop(_EXECUTEMANY_KEY, False))

    duration_ms = int((time.monotonic() - started) * 1000)
    http_method = get_http_method()
    http_path = get_http_path()
    tier = classify_sql_tier(http_method, http_path)
    severity = classify_severity(duration_ms, tier, cfg)
    if severity is None:
        return

    rows_affected: int | None = None
    if not failed and cursor is not None:
        try:
            rc = cursor.rowcount
            if rc is not None and rc >= 0:
                rows_affected = int(rc)
        except Exception:
            rows_affected = None

    full_sql = render_audit_sql(
        statement,
        callback_parameters=parameters,
        stored_parameters=stored_parameters,
        executemany=exec_many,
    )
    event_obj = SlowSqlEvent(
        request_id=get_request_id(),
        http_method=http_method,
        http_path=http_path,
        user_id=get_actor_id(),
        username=get_actor_username(),
        tenant_id=get_tenant_id(),
        tier=tier,
        severity=severity,
        duration_ms=duration_ms,
        threshold_ms=threshold_ms_for_severity(severity, tier, cfg),
        sql_fingerprint=sql_fingerprint(statement),
        sql_text=full_sql,
        rows_affected=rows_affected,
        executemany=exec_many,
    )
    _schedule_enqueue(event_obj)


async def _worker_loop() -> None:
    from omni_api.services.audit_service import AuditService

    assert _queue is not None
    svc = AuditService()
    while True:
        event = await _queue.get()
        try:
            await svc.record_slow_sql(event)
        except Exception:
            logger.exception("异步写入慢 SQL 审计失败")
        finally:
            _queue.task_done()


async def start_slow_sql_worker() -> None:
    """启动慢 SQL 异步写入 worker。"""
    global _queue, _worker_task
    cfg = get_settings().audit
    if not cfg.slow_sql_enabled:
        return
    if _worker_task is not None:
        return
    _queue = asyncio.Queue(maxsize=cfg.slow_sql_queue_size)
    _worker_task = asyncio.create_task(_worker_loop())


async def stop_slow_sql_worker() -> None:
    """停止 worker 并清空队列引用。"""
    global _queue, _worker_task
    if _worker_task is not None:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
        _worker_task = None
    _queue = None


def attach_sql_audit_listener(engine: AsyncEngine) -> None:
    """在 sync_engine 上注册 before/after cursor 事件（幂等）。"""
    global _listeners_attached
    if _listeners_attached:
        return
    sync = engine.sync_engine

    @event.listens_for(sync, "before_cursor_execute")
    def _before(
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        if not get_settings().audit.slow_sql_enabled:
            return
        if _should_skip(statement):
            return
        conn.info[_TIMING_KEY] = time.monotonic()
        conn.info[_PARAMS_KEY] = parameters
        conn.info[_EXECUTEMANY_KEY] = executemany

    @event.listens_for(sync, "after_cursor_execute")
    def _after(
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        _finalize(
            conn,
            cursor,
            statement,
            parameters=parameters,
            executemany=executemany,
            failed=False,
        )

    @event.listens_for(sync, "handle_error")
    def _on_error(exception_context: Any) -> None:
        try:
            conn = exception_context.connection
            statement = exception_context.statement or ""
            if conn is None or not statement:
                return
            # SQLAlchemy 部分错误路径下 cursor slot 未赋值，直接访问会 AttributeError
            cursor = getattr(exception_context, "cursor", None)
            _finalize(
                conn,
                cursor,
                statement,
                parameters=getattr(exception_context, "parameters", None),
                executemany=bool(getattr(exception_context, "executemany", False)),
                failed=True,
            )
        except Exception:
            logger.debug("慢 SQL 审计 handle_error 回调失败", exc_info=True)

    _listeners_attached = True
