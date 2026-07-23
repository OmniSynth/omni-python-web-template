"""租户系统角色绑定 MySQL 仓储。"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.actor import get_actor_id
from omni_api.data.mysql.biz_table import SYS_TENANT_SYSTEM_ROLE
from omni_api.data.mysql.sys_role_repo import SysRoleRepo
from omni_api.data.mysql.sys_sql import create_tenant_system_role_sql
from omni_api.schemas.sys_role_type import ROLE_TYPE_TENANT

DEFAULT_SYSTEM_ROLE_BINDINGS: tuple[str, ...] = ("operator", "viewer")


async def validate_bindable_role_codes(
    engine: AsyncEngine, codes: list[str]
) -> list[str]:
    """校验并去重可绑定的租户类型平台角色。"""
    if not codes:
        raise ValueError("至少绑定一个系统角色")
    sys_repo = SysRoleRepo(engine)
    unique: list[str] = []
    seen: set[str] = set()
    for code in codes:
        if code in seen:
            continue
        role = await sys_repo.get_by_code(code)
        if role is None or role.role_type != ROLE_TYPE_TENANT:
            raise ValueError(f"不可绑定的系统角色: {code}")
        seen.add(code)
        unique.append(code)
    return unique


class TenantSystemRoleRepo:
    """租户与预置系统角色模板绑定。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def ensure_schema(self) -> None:
        async with self._engine.begin() as conn:
            await conn.execute(text(create_tenant_system_role_sql()))

    async def list_role_codes(self, tenant_id: int) -> list[str]:
        sql = text(
            f"SELECT role_code FROM {SYS_TENANT_SYSTEM_ROLE} "
            f"WHERE tenant_id=:tid ORDER BY role_code"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"tid": tenant_id})).fetchall()
        return [str(r[0]) for r in rows]

    async def list_tenant_ids_for_role(self, role_code: str) -> list[int]:
        sql = text(
            f"SELECT tenant_id FROM {SYS_TENANT_SYSTEM_ROLE} "
            f"WHERE role_code=:code ORDER BY tenant_id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"code": role_code})).fetchall()
        return [int(r[0]) for r in rows]

    async def set_bindings(self, tenant_id: int, role_codes: list[str]) -> list[str]:
        codes = await validate_bindable_role_codes(self._engine, role_codes)
        actor = get_actor_id()
        async with self._engine.begin() as conn:
            await conn.execute(
                text(f"DELETE FROM {SYS_TENANT_SYSTEM_ROLE} WHERE tenant_id=:tid"),
                {"tid": tenant_id},
            )
            insert_sql = text(
                f"INSERT INTO {SYS_TENANT_SYSTEM_ROLE} "
                f"(tenant_id, role_code, created_by, updated_by) "
                f"VALUES (:tid, :code, :cb, :ub)"
            )
            for code in codes:
                await conn.execute(
                    insert_sql,
                    {"tid": tenant_id, "code": code, "cb": actor, "ub": actor},
                )
        return codes
