"""机构 MySQL 仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.actor import get_actor_id
from omni_api.data.mysql.list_sort import SortOrder, build_order_clause
from omni_api.data.mysql.biz_table import SYS_ORG_TENANT, SYS_ORGANIZATION
from omni_api.schemas.tenant import (
    OrganizationCreate,
    OrganizationRecord,
    OrganizationUpdate,
    OrgType,
)
from omni_api.services.org_credit_code import (
    ensure_org_credit_code_available,
    validate_credit_code,
)
from omni_api.services.phone import ensure_org_phone_available, normalize_phone

_ORG_SORT_FIELDS = {
    "id": "id",
    "name": "name",
    "org_type": "org_type",
    "credit_code": "credit_code",
    "enabled": "enabled",
    "created_at": "created_at",
}

_ORG_SELECT = (
    f"SELECT id, name, org_type, credit_code, phone, enabled, created_at, updated_at "
    f"FROM {SYS_ORGANIZATION}"
)


def _row_to_org(row: Sequence[Any]) -> OrganizationRecord:
    return OrganizationRecord(
        id=int(row[0]),
        name=str(row[1]),
        org_type=cast(OrgType, str(row[2])),
        credit_code=str(row[3]),
        phone=str(row[4]),
        enabled=bool(row[5]),
        created_at=row[6],
        updated_at=row[7],
    )


class OrgRepo:
    """机构与机构-租户绑定。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def list_orgs(
        self,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[OrganizationRecord]:
        """平台机构列表：不做数据范围裁剪。"""
        order = build_order_clause(
            sort_by,
            sort_order,
            _ORG_SORT_FIELDS,
            default_field="id",
        )
        sql = text(f"{_ORG_SELECT}{order}")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_org(r) for r in rows]

    async def get_by_id(self, org_id: int) -> OrganizationRecord | None:
        sql = text(f"{_ORG_SELECT} WHERE id=:id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": org_id})).fetchone()
        return _row_to_org(row) if row else None

    async def get_by_credit_code(self, credit_code: str) -> OrganizationRecord | None:
        cc = validate_credit_code(credit_code, required=True)
        sql = text(f"{_ORG_SELECT} WHERE credit_code=:cc LIMIT 1")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"cc": cc})).fetchone()
        return _row_to_org(row) if row else None

    async def create(self, body: OrganizationCreate) -> OrganizationRecord:
        return await self.create_basic(
            name=body.name,
            org_type=body.org_type,
            credit_code=body.credit_code,
            phone=body.phone,
            enabled=body.enabled,
        )

    async def create_basic(
        self,
        *,
        name: str,
        org_type: str,
        credit_code: str,
        phone: str,
        enabled: bool,
    ) -> OrganizationRecord:
        """仅写机构表（不含租户开通）。"""
        cc = validate_credit_code(credit_code, required=True)
        normalized_phone = normalize_phone(phone)
        await ensure_org_credit_code_available(self._engine, cc)
        await ensure_org_phone_available(self._engine, normalized_phone)
        actor = get_actor_id()
        sql = text(
            f"INSERT INTO {SYS_ORGANIZATION} "
            f"(name, org_type, credit_code, phone, enabled, created_by, updated_by) "
            f"VALUES (:name, :org_type, :cc, :phone, :en, :cb, :ub)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql,
                {
                    "name": name,
                    "org_type": org_type,
                    "cc": cc,
                    "phone": normalized_phone,
                    "en": int(enabled),
                    "cb": actor,
                    "ub": actor,
                },
            )
            org_id = int(result.lastrowid)
        org = await self.get_by_id(org_id)
        assert org is not None
        return org

    async def update(self, org_id: int, body: OrganizationUpdate) -> OrganizationRecord | None:
        current = await self.get_by_id(org_id)
        if current is None:
            return None
        name = body.name if body.name is not None else current.name
        org_type = body.org_type if body.org_type is not None else current.org_type
        credit_code = (
            validate_credit_code(body.credit_code, required=True)
            if body.credit_code is not None
            else current.credit_code
        )
        if not credit_code:
            raise ValueError("请填写统一社会信用代码")
        if credit_code != current.credit_code:
            await ensure_org_credit_code_available(
                self._engine, credit_code, exclude_org_id=org_id
            )
        phone = current.phone
        if body.phone is not None:
            stripped = body.phone.strip()
            if stripped != current.phone:
                phone = normalize_phone(stripped)
                await ensure_org_phone_available(
                    self._engine, phone, exclude_org_id=org_id
                )
        enabled = body.enabled if body.enabled is not None else current.enabled
        actor = get_actor_id()
        sql = text(
            f"UPDATE {SYS_ORGANIZATION} SET name=:name, org_type=:org_type, "
            f"credit_code=:cc, phone=:phone, enabled=:en, updated_by=:ub WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "id": org_id,
                    "name": name,
                    "org_type": org_type,
                    "cc": credit_code,
                    "phone": phone,
                    "en": int(enabled),
                    "ub": actor,
                },
            )
        return await self.get_by_id(org_id)

    async def list_primary_orgs_by_tenant(self) -> dict[int, OrganizationRecord]:
        """每个租户取首个关联机构（按机构 ID 升序）。"""
        sql = text(
            f"SELECT ot.tenant_id, o.id, o.name, o.org_type, o.credit_code, o.phone, o.enabled, "
            f"o.created_at, o.updated_at "
            f"FROM {SYS_ORG_TENANT} ot "
            f"JOIN {SYS_ORGANIZATION} o ON o.id = ot.org_id "
            f"ORDER BY ot.tenant_id, o.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        result: dict[int, OrganizationRecord] = {}
        for row in rows:
            tenant_id = int(row[0])
            if tenant_id in result:
                continue
            result[tenant_id] = _row_to_org(row[1:])
        return result
