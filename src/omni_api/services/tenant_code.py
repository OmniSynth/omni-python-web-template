"""租户编码生成：行业前缀（机构类型）+ 地区前缀 + 自增序号。"""

from __future__ import annotations

import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from omni_api.data.mysql.biz_table import SYS_TENANT
from omni_api.schemas.tenant import OrgType

# 机构类型 -> 行业前缀（2 位小写字母）
ORG_TYPE_INDUSTRY_PREFIX: dict[OrgType, str] = {
    "company": "co",
    "government": "gv",
    "school": "sc",
    "hospital": "hp",
    "association": "as",
}
DEFAULT_INDUSTRY_PREFIX = "gn"
_SEQ_WIDTH = 4


def industry_prefix(org_type: str | None) -> str:
    """根据机构类型返回行业前缀。"""
    if org_type and org_type in ORG_TYPE_INDUSTRY_PREFIX:
        return ORG_TYPE_INDUSTRY_PREFIX[org_type]  # type: ignore[index]
    return DEFAULT_INDUSTRY_PREFIX


def normalize_region(region: str) -> str:
    """地区编码：小写字母数字，2–8 位。"""
    cleaned = re.sub(r"[^a-zA-Z0-9]", "", region.strip().lower())
    if len(cleaned) < 2:
        raise ValueError("地区编码至少 2 位字母或数字")
    if len(cleaned) > 8:
        raise ValueError("地区编码最多 8 位")
    return cleaned


def build_code_prefix(org_type: str | None, region: str) -> str:
    """生成编码前缀（不含序号），格式 {行业}-{地区}。"""
    return f"{industry_prefix(org_type)}-{normalize_region(region)}"


def _parse_seq_from_code(code: str, prefix: str) -> int | None:
    """从已有 code 解析序号，格式 {prefix}-{序号}。"""
    expected = f"{prefix}-"
    if not code.startswith(expected):
        return None
    suffix = code[len(expected) :]
    if suffix.isdigit():
        return int(suffix)
    return None


async def allocate_tenant_code(
    conn: AsyncConnection, org_type: str | None, region: str
) -> str:
    """分配下一个租户 code，格式 {行业}-{地区}-{序号:04d}，如 co-110105-0001。"""
    prefix = build_code_prefix(org_type, region)
    row = (
        await conn.execute(
            text(
                f"SELECT code FROM {SYS_TENANT} "
                f"WHERE code LIKE :pfx "
                f"ORDER BY code DESC LIMIT 1"
            ),
            {"pfx": f"{prefix}-%"},
        )
    ).fetchone()
    next_seq = 1
    if row is not None:
        parsed = _parse_seq_from_code(str(row[0]), prefix)
        if parsed is not None:
            next_seq = parsed + 1
    if next_seq >= 10**_SEQ_WIDTH:
        raise ValueError(f"租户编码序号已用尽: {prefix}")
    return f"{prefix}-{next_seq:04d}"
