"""MySQL DATETIME 列 UTC 时间工具。"""

from __future__ import annotations

from datetime import datetime, timezone


def utc_now() -> datetime:
    """返回 naive UTC，供 DATETIME 列绑定。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def naive_utc(dt: datetime) -> datetime:
    """将 aware 时间转为 UTC naive；已是 naive 则原样返回（约定为 UTC）。"""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)
