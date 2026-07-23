"""审计日志敏感字段脱敏。"""

from __future__ import annotations

import re
from typing import Any

_SENSITIVE_KEYS = frozenset(
    {
        "password",
        "password_hash",
        "secret",
        "secret_key",
        "token",
        "access_token",
        "session_token",
        "authorization",
        "api_key",
        "private_key",
    }
)

_MASK = "***"
_MAX_DEPTH = 8
_MAX_LIST = 50
_MAX_STR = 2000


def _is_sensitive_key(key: str) -> bool:
    lower = key.lower()
    if lower in _SENSITIVE_KEYS:
        return True
    return any(part in lower for part in ("password", "secret", "token"))


def mask_value(value: Any, *, depth: int = 0) -> Any:
    """递归脱敏并截断复杂结构。"""
    if depth > _MAX_DEPTH:
        return "[truncated:depth]"
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        if len(value) > _MAX_STR:
            return value[:_MAX_STR] + "…[truncated]"
        return value
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if _is_sensitive_key(str(k)):
                out[str(k)] = _MASK
            else:
                out[str(k)] = mask_value(v, depth=depth + 1)
        return out
    if isinstance(value, (list, tuple)):
        items = [mask_value(v, depth=depth + 1) for v in value[:_MAX_LIST]]
        if len(value) > _MAX_LIST:
            items.append(f"[truncated:{len(value) - _MAX_LIST} more]")
        return items
    return str(value)


def mask_model(obj: Any) -> dict[str, Any] | None:
    """将 Pydantic 模型或 dict 转为脱敏 dict。"""
    if obj is None:
        return None
    if hasattr(obj, "model_dump"):
        return mask_value(obj.model_dump())
    if isinstance(obj, dict):
        return mask_value(obj)
    return mask_value({"value": obj})


def truncate_text(text: str | None, max_len: int = 512) -> str | None:
    if text is None:
        return None
    text = re.sub(r"\s+", " ", text.strip())
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"
