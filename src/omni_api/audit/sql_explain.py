"""慢 SQL 自动 EXPLAIN 分析。"""

from __future__ import annotations

import logging
import re
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.sql_audit_listener import bump_sql_audit_depth, reset_sql_audit_depth

logger = logging.getLogger(__name__)

ExplainStatus = Literal["ok", "skipped", "error"]

_NON_EXPLAIN_PREFIXES = (
    "insert",
    "update",
    "delete",
    "replace",
    "create",
    "drop",
    "alter",
    "truncate",
    "grant",
    "revoke",
    "set",
    "show",
    "call",
    "begin",
    "commit",
    "rollback",
    "explain",
    "use",
    "lock",
    "unlock",
)

_WARNING_MARKERS = (
    "Using filesort",
    "Using temporary",
    "Using join buffer",
    "Full table scan",
)

_PARAM_PLACEHOLDER = re.compile(r"(%s|%\(\w+\)s|:\w+)")


def has_unbound_params(sql: str) -> bool:
    """语句是否仍含 DBAPI / SQLAlchemy 参数占位符。"""
    return bool(_PARAM_PLACEHOLDER.search(sql))


def is_explainable(sql: str) -> bool:
    """判断是否可对语句执行 EXPLAIN（仅 SELECT / WITH）。"""
    stripped = sql.strip().rstrip(";")
    if not stripped:
        return False
    lower = stripped.lower()
    if lower.startswith("with ") or lower.startswith("select "):
        return True
    for prefix in _NON_EXPLAIN_PREFIXES:
        if lower.startswith(prefix + " ") or lower == prefix:
            return False
    return lower.startswith("(") and is_explainable(stripped[1:].lstrip())


def _clean_sql(sql: str) -> str:
    return re.sub(r"\s+", " ", sql.strip().rstrip(";"))


def _skip_payload(reason: str) -> dict[str, Any]:
    return {"status": "skipped", "reason": reason}


def _row_get(row: dict[str, Any], *keys: str) -> Any:
    lower_map = {str(k).lower(): v for k, v in row.items()}
    for key in keys:
        val = lower_map.get(key.lower())
        if val is not None:
            return val
    return None


def summarize_explain_plan(plan: list[dict[str, Any]]) -> dict[str, Any]:
    """从 EXPLAIN 结果提取简要诊断。"""
    max_rows = 0
    uses_index = False
    warnings: list[str] = []
    seen: set[str] = set()

    for row in plan:
        rows_val = _row_get(row, "rows")
        if rows_val is not None:
            try:
                max_rows = max(max_rows, int(rows_val))
            except (TypeError, ValueError):
                pass

        access_type = str(_row_get(row, "type") or "").upper()
        key = _row_get(row, "key")
        if key and access_type not in ("ALL", ""):
            uses_index = True

        extra = str(_row_get(row, "Extra", "extra") or "")
        for marker in _WARNING_MARKERS:
            if marker.lower() in extra.lower() and marker not in seen:
                warnings.append(marker)
                seen.add(marker)

    return {
        "max_rows_examined": max_rows if max_rows > 0 else None,
        "uses_index": uses_index,
        "warnings": warnings,
    }


def _normalize_plan_rows(rows: list[Any]) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    for row in rows:
        if hasattr(row, "_mapping"):
            plan.append({str(k): v for k, v in row._mapping.items()})
        elif isinstance(row, dict):
            plan.append({str(k): v for k, v in row.items()})
        else:
            plan.append({str(k): v for k, v in dict(row).items()})
    return plan


async def run_explain(
    engine: AsyncEngine,
    sql: str,
    parameters: tuple[Any, ...] | dict[str, Any] | None = None,
) -> dict[str, Any]:
    """执行 EXPLAIN 并返回结构化结果。"""
    cleaned = _clean_sql(sql)
    if not cleaned:
        return _skip_payload("empty_sql")
    if has_unbound_params(cleaned) and parameters is None:
        return _skip_payload("missing_parameters")

    depth_token = bump_sql_audit_depth()
    explain_sql = f"EXPLAIN FORMAT=TRADITIONAL {cleaned}"
    try:
        async with engine.connect() as conn:
            if parameters is None:
                result = await conn.exec_driver_sql(explain_sql)
            else:
                result = await conn.exec_driver_sql(explain_sql, parameters)
            plan = _normalize_plan_rows(list(result.mappings()))
        payload: dict[str, Any] = {"status": "ok", "plan": plan}
        payload["summary"] = summarize_explain_plan(plan)
        return payload
    except Exception as exc:
        logger.warning("慢 SQL EXPLAIN 失败: %s | sql=%s", exc, cleaned[:200])
        return {"status": "error", "error": str(exc)[:512]}
    finally:
        reset_sql_audit_depth(depth_token)


async def build_explain_meta(
    engine: AsyncEngine,
    sql: str,
    *,
    enabled: bool,
    parameters: tuple[Any, ...] | dict[str, Any] | None = None,
    executemany: bool = False,
) -> dict[str, Any] | None:
    """构建写入 meta_json 的 explain 字段（仅超阈值落库后调用）。"""
    if not enabled:
        return None
    if executemany:
        return {"explain": _skip_payload("executemany")}
    if not is_explainable(sql):
        return {"explain": _skip_payload("non_select")}
    explain = await run_explain(engine, sql, parameters)
    return {"explain": explain}
