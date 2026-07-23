"""慢 SQL 文本归一化、参数内联与指纹。"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Mapping
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from omni_api.audit.mask import truncate_text

_MAX_SQL_LEN = 4096

# 字面量替换为 ? 便于聚合
_LITERAL_PATTERN = re.compile(
    r"('(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|\b\d+(?:\.\d+)?\b)",
    re.IGNORECASE,
)

_NAMED_PARAM_PATTERN = re.compile(r"%\((\w+)\)s")
_POS_PARAM_PATTERN = re.compile(r"%s")


def normalize_sql(statement: str) -> str:
    """压缩空白并将字面量占位，用于指纹计算。"""
    text = re.sub(r"\s+", " ", statement.strip())
    return _LITERAL_PATTERN.sub("?", text)


def sql_fingerprint(statement: str) -> str:
    normalized = normalize_sql(statement)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]


def _format_sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return format(value, "g")
    if isinstance(value, (bytes, bytearray)):
        return "x'" + bytes(value).hex() + "'"
    if isinstance(value, datetime):
        return "'" + value.strftime("%Y-%m-%d %H:%M:%S.%f") + "'"
    if isinstance(value, date):
        return "'" + value.isoformat() + "'"
    text = str(value).replace("\\", "\\\\").replace("'", "''")
    return f"'{text}'"


def _positional_placeholder_count(sql: str) -> int:
    return len(_POS_PARAM_PATTERN.findall(sql))


def _as_mapping(parameters: Any) -> dict[str, Any] | None:
    if parameters is None:
        return None
    if isinstance(parameters, Mapping):
        return {str(key): value for key, value in parameters.items()}
    return None


def normalize_audit_parameters(
    parameters: Any,
    *,
    executemany: bool = False,
) -> dict[str, Any] | tuple[Any, ...] | None:
    """将 SQLAlchemy / DBAPI 参数规范为 dict 或 tuple。"""
    mapping = _as_mapping(parameters)
    if mapping is not None:
        return mapping if mapping else None
    if isinstance(parameters, (list, tuple)):
        if not parameters:
            return None
        if executemany and isinstance(parameters[0], (list, tuple, Mapping, dict)):
            return normalize_audit_parameters(parameters[0], executemany=False)
        if len(parameters) == 1 and isinstance(parameters[0], (list, tuple, Mapping, dict)):
            return normalize_audit_parameters(parameters[0], executemany=False)
        return tuple(parameters)
    return (parameters,)


def _can_inline_parameters(sql: str, parameters: dict[str, Any] | tuple[Any, ...]) -> bool:
    named_keys = {match.group(1) for match in _NAMED_PARAM_PATTERN.finditer(sql)}
    positional_count = _positional_placeholder_count(sql)
    if isinstance(parameters, dict):
        if named_keys:
            return named_keys.issubset(parameters.keys())
        return positional_count > 0 and len(parameters) == positional_count
    return positional_count == len(parameters)


def _inline_positional_params(sql: str, parameters: tuple[Any, ...] | list[Any]) -> str:
    parts = _POS_PARAM_PATTERN.split(sql)
    placeholder_count = len(parts) - 1
    if placeholder_count != len(parameters):
        return sql
    out: list[str] = []
    for index, part in enumerate(parts[:-1]):
        out.append(part)
        out.append(_format_sql_literal(parameters[index]))
    out.append(parts[-1])
    return "".join(out)


def _inline_named_params(sql: str, parameters: dict[str, Any]) -> str:
    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in parameters:
            return match.group(0)
        return _format_sql_literal(parameters[key])

    return _NAMED_PARAM_PATTERN.sub(replace, sql)


def _inline_parameters(sql: str, parameters: dict[str, Any] | tuple[Any, ...]) -> str:
    if isinstance(parameters, dict):
        if _NAMED_PARAM_PATTERN.search(sql):
            return _inline_named_params(sql, parameters)
        return _inline_positional_params(sql, tuple(parameters.values()))
    return _inline_positional_params(sql, parameters)


def resolve_audit_parameters(
    statement: str,
    callback_parameters: Any,
    stored_parameters: Any,
    *,
    executemany: bool = False,
) -> dict[str, Any] | tuple[Any, ...] | None:
    """优先选用能与 statement 占位符匹配的参数集。"""
    candidates = [callback_parameters, stored_parameters]
    normalized: list[dict[str, Any] | tuple[Any, ...]] = []
    for candidate in candidates:
        norm = normalize_audit_parameters(candidate, executemany=executemany)
        if norm is not None:
            normalized.append(norm)
    for norm in normalized:
        if _can_inline_parameters(statement, norm):
            return norm
    return normalized[0] if normalized else None


def render_audit_sql(
    statement: str,
    callback_parameters: Any = None,
    stored_parameters: Any = None,
    *,
    executemany: bool = False,
) -> str:
    """将 DBAPI 参数内联为可手动执行的完整 SQL（审计落库用）。"""
    sql = re.sub(r"\s+", " ", statement.strip())
    if not sql:
        return ""
    parameters = resolve_audit_parameters(
        sql,
        callback_parameters,
        stored_parameters,
        executemany=executemany,
    )
    if parameters is None:
        return truncate_text(sql, _MAX_SQL_LEN) or ""
    if _can_inline_parameters(sql, parameters):
        sql = _inline_parameters(sql, parameters)
    return truncate_text(sql, _MAX_SQL_LEN) or ""
