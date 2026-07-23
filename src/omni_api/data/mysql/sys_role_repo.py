"""平台系统角色 MySQL 仓储（t_sys_roles / t_sys_role_permissions / t_sys_user_roles）。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, cast

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.auth.permission_seed import DEFAULT_ROLE_DEFS, ROLE_ADMIN
from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.biz_table import (
    SYS_ROLE_PERMISSIONS,
    SYS_ROLES,
    SYS_USER,
    SYS_USER_ROLES,
)
from omni_api.data.mysql.list_sort import SortOrder, build_order_clause
from omni_api.data.mysql.permission_repo import PermissionRepo
from omni_api.data.mysql.sys_sql import create_sys_roles_sql
from omni_api.schemas.rbac import RoleCreate, RoleRecord, RoleSummary, RoleUpdate
from omni_api.schemas.sys_role_type import ROLE_TYPE_SYSTEM, ROLE_TYPE_TENANT, RoleType

logger = logging.getLogger(__name__)

_ROLE_SORT_FIELDS = {
    "id": "id",
    "code": "code",
    "name": "name",
    "created_at": "created_at",
}

_ROLE_SELECT = (
    f"SELECT id, code, name, description, role_type, created_at, updated_at FROM {SYS_ROLES}"
)


def _row_to_role(row: Sequence[Any], permissions: list[str] | None = None) -> RoleRecord:
    return RoleRecord(
        id=int(row[0]),
        code=str(row[1]),
        name=str(row[2]),
        description=str(row[3]),
        role_type=cast(RoleType, str(row[4])),
        data_scope=1,
        permissions=permissions or [],
        created_at=row[5],
        updated_at=row[6],
    )


class SysRoleRepo:
    """平台级系统角色与用户绑定。"""

    def __init__(
        self,
        engine: AsyncEngine,
        permission_repo: PermissionRepo | None = None,
    ) -> None:
        self._engine = engine
        self._perm_repo = permission_repo or PermissionRepo(engine)

    async def ensure_schema(self) -> None:
        async with self._engine.begin() as conn:
            for stmt in create_sys_roles_sql().split(";"):
                s = stmt.strip()
                if s:
                    await conn.execute(text(s))

    async def count_roles(self) -> int:
        sql = text(f"SELECT COUNT(*) FROM {SYS_ROLES}")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql)).fetchone()
        return int(row[0]) if row else 0

    async def list_roles(
        self,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[RoleRecord]:
        """平台系统角色列表：不做数据范围裁剪。"""
        order = build_order_clause(
            sort_by,
            sort_order,
            _ROLE_SORT_FIELDS,
            default_field="id",
        )
        sql = text(f"{_ROLE_SELECT}{order}")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        role_ids = [int(row[0]) for row in rows]
        perm_map = await self._role_permissions_map(role_ids)
        result: list[RoleRecord] = []
        for row in rows:
            rid = int(row[0])
            result.append(_row_to_role(row, perm_map.get(rid, [])))
        return result

    async def get_by_code(self, code: str) -> RoleRecord | None:
        sql = text(f"{_ROLE_SELECT} WHERE code = :code")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"code": code})).fetchone()
        if row is None:
            return None
        perms = await self._role_permissions(int(row[0]))
        return _row_to_role(row, perms)

    async def list_tenant_bindable_roles(self) -> list[RoleRecord]:
        """机构/租户可绑定的平台角色（类型为租户）。"""
        sql = text(
            f"{_ROLE_SELECT} WHERE role_type = :rt ORDER BY id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"rt": ROLE_TYPE_TENANT})).fetchall()
        return [_row_to_role(row, []) for row in rows]

    async def create_role(self, body: RoleCreate) -> RoleRecord:
        if await self.get_by_code(body.code) is not None:
            raise ValueError(f"系统角色已存在: {body.code}")
        if body.code == ROLE_ADMIN and body.role_type != ROLE_TYPE_SYSTEM:
            raise ValueError("admin 角色必须为系统类型")
        audit = audit_insert_params()
        sql = text(
            f"INSERT INTO {SYS_ROLES} (code, name, description, role_type, created_by, updated_by) "
            f"VALUES (:code, :name, :description, :role_type, :created_by, :updated_by)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql,
                {
                    "code": body.code,
                    "name": body.name,
                    "description": body.description,
                    "role_type": body.role_type,
                    **audit,
                },
            )
            role_id = int(result.lastrowid)
        created = await self.get_by_id(role_id)
        assert created is not None
        return created

    async def get_by_id(self, role_id: int) -> RoleRecord | None:
        sql = text(f"{_ROLE_SELECT} WHERE id = :id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": role_id})).fetchone()
        if row is None:
            return None
        perms = await self._role_permissions(role_id)
        return _row_to_role(row, perms)

    async def update_role(self, role_id: int, body: RoleUpdate) -> RoleRecord | None:
        current = await self.get_by_id(role_id)
        if current is None:
            return None
        name = body.name if body.name is not None else current.name
        desc = body.description if body.description is not None else current.description
        sql = text(
            f"UPDATE {SYS_ROLES} SET name=:name, description=:desc, "
            f"updated_by=:updated_by WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {"id": role_id, "name": name, "desc": desc, **audit_update_params()},
            )
        return await self.get_by_id(role_id)

    async def set_role_permissions(
        self, role_id: int, permissions: list[str]
    ) -> RoleRecord | None:
        await self._perm_repo.validate_codes(permissions)
        role = await self.get_by_id(role_id)
        if role is None:
            return None
        async with self._engine.begin() as conn:
            await conn.execute(
                text(f"DELETE FROM {SYS_ROLE_PERMISSIONS} WHERE role_id = :id"),
                {"id": role_id},
            )
            if permissions:
                insert_sql = text(
                    f"INSERT INTO {SYS_ROLE_PERMISSIONS} "
                    f"(role_id, permission_code, created_by, updated_by) "
                    f"VALUES (:rid, :code, :created_by, :updated_by)"
                )
                audit = audit_insert_params()
                for code in permissions:
                    await conn.execute(
                        insert_sql, {"rid": role_id, "code": code, **audit}
                    )
        return await self.get_by_id(role_id)

    async def ensure_default_roles(self) -> None:
        await self.ensure_schema()
        created: list[str] = []
        for code, (name, desc, assignable) in DEFAULT_ROLE_DEFS.items():
            role = await self.get_by_code(code)
            if role is None:
                role_type = ROLE_TYPE_SYSTEM if code == ROLE_ADMIN else ROLE_TYPE_TENANT
                role = await self.create_role(
                    RoleCreate(
                        code=code,
                        name=name,
                        description=desc,
                        role_type=role_type,
                    )
                )
                created.append(code)
            elif code == ROLE_ADMIN and role.role_type != ROLE_TYPE_SYSTEM:
                async with self._engine.begin() as conn:
                    await conn.execute(
                        text(
                            f"UPDATE {SYS_ROLES} SET role_type=:rt, updated_by=:updated_by "
                            f"WHERE code=:code"
                        ),
                        {"rt": ROLE_TYPE_SYSTEM, "code": code, **audit_update_params()},
                    )
            if code == ROLE_ADMIN:
                await self.sync_admin_permissions()
            elif not role.permissions:
                perms = await self._perm_repo.expand_codes(assignable)
                await self.set_role_permissions(role.id, perms)
        if created:
            logger.info("已初始化平台系统角色: %s", ", ".join(created))

    async def sync_admin_permissions(self) -> list[str]:
        """将平台 admin 角色对齐为注册表全量 enabled 权限。"""
        role = await self.get_by_code(ROLE_ADMIN)
        if role is None:
            raise ValueError(f"系统角色不存在: {ROLE_ADMIN}")
        expected = set(await self._perm_repo.list_enabled_codes())
        current = set(role.permissions)
        if current == expected:
            return []
        added = sorted(expected - current)
        await self.set_role_permissions(role.id, sorted(expected))
        if added:
            logger.info("平台 admin 已补齐权限: %s", ", ".join(added))
        return added

    async def get_user_role_codes(self, user_id: int) -> list[str]:
        sql = text(
            f"SELECT r.code FROM {SYS_USER_ROLES} ur "
            f"JOIN {SYS_ROLES} r ON r.id = ur.role_id "
            f"WHERE ur.user_id = :uid ORDER BY r.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        return [str(r[0]) for r in rows]

    async def get_user_role_summaries(self, user_id: int) -> list[RoleSummary]:
        sql = text(
            f"SELECT r.id, r.code, r.name FROM {SYS_USER_ROLES} ur "
            f"JOIN {SYS_ROLES} r ON r.id = ur.role_id "
            f"WHERE ur.user_id = :uid ORDER BY r.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        return [RoleSummary(id=int(r[0]), code=str(r[1]), name=str(r[2])) for r in rows]

    async def get_user_permissions(self, user_id: int) -> set[str]:
        sql = text(
            f"SELECT DISTINCT rp.permission_code FROM {SYS_USER_ROLES} ur "
            f"JOIN {SYS_ROLE_PERMISSIONS} rp ON rp.role_id = ur.role_id "
            f"WHERE ur.user_id = :uid"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        return {str(r[0]) for r in rows}

    async def list_users_with_role(self, role_code: str) -> list[tuple[int, str]]:
        """返回拥有指定系统角色的 (user_id, username) 列表。"""
        sql = text(
            f"SELECT u.id, u.username FROM {SYS_USER_ROLES} ur "
            f"JOIN {SYS_ROLES} r ON r.id = ur.role_id "
            f"JOIN {SYS_USER} u ON u.id = ur.user_id "
            f"WHERE r.code = :code ORDER BY u.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"code": role_code})).fetchall()
        return [(int(r[0]), str(r[1])) for r in rows]

    async def assign_role_by_code(self, user_id: int, role_code: str) -> None:
        role = await self.get_by_code(role_code)
        if role is None:
            raise ValueError(f"系统角色不存在: {role_code}")
        sql = text(
            f"INSERT IGNORE INTO {SYS_USER_ROLES} "
            f"(user_id, role_id, created_by, updated_by) "
            f"VALUES (:uid, :rid, :created_by, :updated_by)"
        )
        audit = audit_insert_params()
        async with self._engine.begin() as conn:
            await conn.execute(
                sql, {"uid": user_id, "rid": role.id, **audit}
            )

    async def _role_permissions(self, role_id: int) -> list[str]:
        perm_map = await self._role_permissions_map([role_id])
        return perm_map.get(role_id, [])

    async def _role_permissions_map(self, role_ids: list[int]) -> dict[int, list[str]]:
        if not role_ids:
            return {}
        sql = text(
            f"SELECT role_id, permission_code FROM {SYS_ROLE_PERMISSIONS} "
            f"WHERE role_id IN :role_ids ORDER BY role_id, permission_code"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"role_ids": tuple(role_ids)})).fetchall()
        grouped: dict[int, list[str]] = {}
        for role_id, code in rows:
            grouped.setdefault(int(role_id), []).append(str(code))
        return grouped
