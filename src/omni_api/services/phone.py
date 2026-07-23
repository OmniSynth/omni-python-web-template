"""手机号格式与唯一性校验。"""

from __future__ import annotations

import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_table import SYS_ORGANIZATION

_PHONE_RE = re.compile(r"^1[3-9]\d{9}$")


def normalize_phone(phone: str) -> str:
    """规范化并校验大陆 11 位手机号。"""
    value = phone.strip()
    if not _PHONE_RE.match(value):
        raise ValueError("手机号格式无效，须为 11 位大陆手机号")
    return value


async def ensure_org_phone_available(
    engine: AsyncEngine,
    phone: str,
    *,
    exclude_org_id: int | None = None,
) -> None:
    """校验机构手机号未被其他机构占用（机构手机号全局唯一）。"""
    normalized = normalize_phone(phone)
    sql = text(f"SELECT id FROM {SYS_ORGANIZATION} WHERE phone=:phone LIMIT 1")
    async with engine.connect() as conn:
        row = (await conn.execute(sql, {"phone": normalized})).fetchone()
    if row is not None and (exclude_org_id is None or int(row[0]) != exclude_org_id):
        raise ValueError("手机号已被其他机构使用")
