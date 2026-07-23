"""机构统一社会信用代码规范化。"""

from __future__ import annotations

import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_table import SYS_ORGANIZATION

_USCC_PATTERN = re.compile(r"^[0-9A-Z]{18}$")


def normalize_credit_code(value: str | None) -> str:
    """去除空白并转大写；空字符串表示未填写。"""
    if value is None:
        return ""
    cleaned = re.sub(r"\s+", "", value.strip().upper())
    return cleaned


def validate_credit_code(value: str, *, required: bool = False) -> str:
    """校验 18 位统一社会信用代码；required 为 True 时不允许为空。"""
    code = normalize_credit_code(value)
    if not code:
        if required:
            raise ValueError("请填写统一社会信用代码")
        return ""
    if len(code) != 18:
        raise ValueError("统一社会信用代码须为 18 位")
    if not _USCC_PATTERN.match(code):
        raise ValueError("统一社会信用代码仅允许数字与大写字母")
    return code


async def ensure_org_credit_code_available(
    engine: AsyncEngine,
    credit_code: str,
    *,
    exclude_org_id: int | None = None,
) -> None:
    """校验统一社会信用代码未被其他机构占用。"""
    code = validate_credit_code(credit_code, required=True)
    sql = text(f"SELECT id FROM {SYS_ORGANIZATION} WHERE credit_code=:code LIMIT 1")
    async with engine.connect() as conn:
        row = (await conn.execute(sql, {"code": code})).fetchone()
    if row is not None and (exclude_org_id is None or int(row[0]) != exclude_org_id):
        raise ValueError("统一社会信用代码已被其他机构使用")
