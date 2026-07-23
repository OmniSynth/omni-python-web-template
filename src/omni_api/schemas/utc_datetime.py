"""API 层 UTC 时间解析与序列化。"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any

from pydantic import BeforeValidator, PlainSerializer

from omni_api.data.mysql.utc import naive_utc


def parse_api_utc(value: str) -> datetime:
    """将 API 时间字符串解析为 naive UTC datetime。"""
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("时间字符串为空")
    normalized = cleaned.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    return naive_utc(dt)


def parse_api_utc_optional(value: str | None) -> datetime | None:
    """可选 API 时间字符串解析。"""
    if value is None or not value.strip():
        return None
    return parse_api_utc(value)


def format_api_utc(dt: datetime) -> str:
    """序列化为 ISO-8601 UTC（6 位小数 + Z）。"""
    utc = naive_utc(dt)
    return utc.strftime("%Y-%m-%dT%H:%M:%S") + f".{utc.microsecond:06d}Z"


def _coerce_utc_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return naive_utc(value)
    if isinstance(value, str):
        return parse_api_utc(value)
    raise TypeError(f"无法解析为 UTC datetime: {type(value)!r}")


UtcDateTime = Annotated[
    datetime,
    BeforeValidator(_coerce_utc_datetime),
    PlainSerializer(format_api_utc, return_type=str),
]
