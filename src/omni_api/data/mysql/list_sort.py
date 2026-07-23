"""列表查询排序子句构建（白名单字段）。"""

from __future__ import annotations

from typing import Literal

SortOrder = Literal["asc", "desc"]


def build_order_clause(
    sort_by: str | None,
    sort_order: SortOrder | None,
    allowed: dict[str, str],
    *,
    default_field: str,
    default_order: SortOrder = "asc",
) -> str:
    """根据白名单生成 ORDER BY 子句。"""
    field_key = sort_by if sort_by in allowed else default_field
    column = allowed[field_key]
    order = sort_order if sort_order in ("asc", "desc") else default_order
    return f" ORDER BY {column} {order.upper()}"
