"""角色与权限绑定 MySQL 仓储（租户物理分表）。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, cast

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.auth.permission_seed import (
    DEFAULT_ROLE_DEFS,
    ROLE_ADMIN,
    ROLE_OPERATOR,
    tenant_admin_baseline_codes,
    tenant_self_service_codes,
)
from omni_api.data.mysql.tenant_system_role_repo import TenantSystemRoleRepo
from omni_api.data.mysql.sys_role_repo import SysRoleRepo
from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.biz_table import biz_table
from omni_api.data.mysql.permission_repo import PermissionRepo
from omni_api.data.mysql.list_sort import SortOrder, build_order_clause
from omni_api.data.mysql.tenant_context import resolve_tenant_id
from omni_api.schemas.data_scope import DEFAULT_DATA_SCOPE
from omni_api.schemas.rbac import RoleCreate, RoleRecord, RoleSummary, RoleUpdate
from omni_api.schemas.sys_role_type import ROLE_TYPE_TENANT
from omni_api.schemas.tenant import RoleDataScopeItem, ScopeItemType
from omni_api.services.data_scope_guard import DataScopeGuard
from omni_api.data.mysql.tenant_schema_cache import ensure_tenant_biz_provisioned

logger = logging.getLogger(__name__)

_ROLE_SORT_FIELDS = {
    "id": "id",
    "code": "code",
    "name": "name",
    "created_at": "created_at",
}

_ROLE_SELECT = "SELECT id, code, name, description, data_scope, system_managed, created_at, updated_at FROM {roles}"


def _primary_preset_code(role_codes: list[str]) -> str:
    """租户管理员权限基线挂载的主预置角色（优先操作员）。"""
    if ROLE_OPERATOR in role_codes:
        return ROLE_OPERATOR
    return role_codes[0]


def _row_to_role(row: Sequence[Any], permissions: list[str] | None = None) -> RoleRecord:
    return RoleRecord(
        id=int(row[0]),
        code=str(row[1]),
        name=str(row[2]),
        description=str(row[3]),
        data_scope=int(row[4]),
        system_managed=bool(row[5]),
        permissions=permissions or [],
        created_at=row[6],
        updated_at=row[7],
    )


class RoleRepo:
    """租户内角色、权限绑定与用户角色仓储。"""

    def __init__(
        self,
        engine: AsyncEngine,
        tenant_id: int | None = None,
        permission_repo: PermissionRepo | None = None,
    ) -> None:
        self._engine = engine
        self._tenant_id = tenant_id
        self._perm_repo = permission_repo or PermissionRepo(engine)

    def _tid(self) -> int:
        return resolve_tenant_id(explicit=self._tenant_id)

    def _roles(self, tenant_id: int | None = None) -> str:
        return biz_table("roles", tenant_id or self._tid())

    def _role_perms(self, tenant_id: int | None = None) -> str:
        return biz_table("role_permissions", tenant_id or self._tid())

    def _user_roles(self, tenant_id: int | None = None) -> str:
        return biz_table("user_roles", tenant_id or self._tid())

    def _role_scope(self, tenant_id: int | None = None) -> str:
        return biz_table("role_data_scope", tenant_id or self._tid())

    async def ensure_schema(self, tenant_id: int | None = None) -> None:
        tid = tenant_id or self._tid()
        await ensure_tenant_biz_provisioned(self._engine, tid)

    async def count_roles(self, tenant_id: int | None = None) -> int:
        t = self._roles(tenant_id)
        sql = text(f"SELECT COUNT(*) FROM {t}")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql)).fetchone()
        return int(row[0]) if row else 0

    async def list_roles(
        self,
        tenant_id: int | None = None,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[RoleRecord]:
        """租户角色列表：固定应用数据权限。"""
        await self.ensure_schema(tenant_id)
        return await self._query_roles(
            tenant_id,
            sort_by=sort_by,
            sort_order=sort_order,
            scoped=True,
        )

    async def list_all_roles(
        self,
        tenant_id: int | None = None,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[RoleRecord]:
        """租户内全部角色（配置场景用，不走数据权限）。"""
        return await self._list_all_roles(
            tenant_id,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def _list_all_roles(
        self,
        tenant_id: int | None = None,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[RoleRecord]:
        """租户内全部角色（同步脚本用，不走数据权限）。"""
        return await self._query_roles(
            tenant_id,
            sort_by=sort_by,
            sort_order=sort_order,
            scoped=False,
        )

    async def _query_roles(
        self,
        tenant_id: int | None,
        *,
        sort_by: str | None,
        sort_order: SortOrder | None,
        scoped: bool,
    ) -> list[RoleRecord]:
        t = self._roles(tenant_id)
        order = build_order_clause(
            sort_by,
            sort_order,
            _ROLE_SORT_FIELDS,
            default_field="id",
        )
        where = ""
        params: dict[str, object] = {}
        if scoped:
            guard = DataScopeGuard(self._engine, tenant_id=tenant_id)
            clause, scope_params = await guard.scope_where(
                dept_column=None, user_column="created_by"
            )
            if clause:
                where = f" WHERE ({clause} OR created_by IS NULL)"
                params.update(scope_params)
        sql = text(f"{_ROLE_SELECT.format(roles=t)}{where}{order}")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, params)).fetchall()
        role_ids = [int(row[0]) for row in rows]
        perm_map = await self._role_permissions_map(role_ids, tenant_id)
        result: list[RoleRecord] = []
        for row in rows:
            rid = int(row[0])
            result.append(_row_to_role(row, perm_map.get(rid, [])))
        return result

    async def get_by_id(self, role_id: int, tenant_id: int | None = None) -> RoleRecord | None:
        await self.ensure_schema(tenant_id)
        t = self._roles(tenant_id)
        sql = text(f"{_ROLE_SELECT.format(roles=t)} WHERE id=:id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": role_id})).fetchone()
        if row is None:
            return None
        perms = await self._role_permissions(role_id, tenant_id)
        record = _row_to_role(row, perms)
        if record.data_scope == 4:
            record.custom_scopes = await self.get_role_data_scopes(role_id, tenant_id)
        return record

    async def get_by_code(self, code: str, tenant_id: int | None = None) -> RoleRecord | None:
        await self.ensure_schema(tenant_id)
        t = self._roles(tenant_id)
        sql = text(f"{_ROLE_SELECT.format(roles=t)} WHERE code=:code")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"code": code})).fetchone()
        if row is None:
            return None
        perms = await self._role_permissions(int(row[0]), tenant_id)
        record = _row_to_role(row, perms)
        if record.data_scope == 4:
            record.custom_scopes = await self.get_role_data_scopes(int(row[0]), tenant_id)
        return record

    async def create_role(
        self,
        body: RoleCreate,
        tenant_id: int | None = None,
        *,
        system_managed: bool = False,
    ) -> RoleRecord:
        await self.ensure_schema(tenant_id)
        t = self._roles(tenant_id)
        ds = body.data_scope if getattr(body, "data_scope", None) is not None else DEFAULT_DATA_SCOPE
        sql = text(
            f"INSERT INTO {t} (code, name, description, data_scope, system_managed, created_by, updated_by) "
            f"VALUES (:code, :name, :desc, :ds, :system_managed, :created_by, :updated_by)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql,
                {
                    "code": body.code,
                    "name": body.name,
                    "desc": body.description,
                    "ds": ds,
                    "system_managed": 1 if system_managed else 0,
                    **audit_insert_params(),
                },
            )
            role_id = int(result.lastrowid)
        role = await self.get_by_id(role_id, tenant_id)
        assert role is not None
        return role

    async def update_role(
        self, role_id: int, body: RoleUpdate, tenant_id: int | None = None
    ) -> RoleRecord | None:
        current = await self.get_by_id(role_id, tenant_id)
        if current is None:
            return None
        name = body.name if body.name is not None else current.name
        desc = body.description if body.description is not None else current.description
        data_scope = body.data_scope if body.data_scope is not None else current.data_scope
        t = self._roles(tenant_id)
        sql = text(
            f"UPDATE {t} SET name=:name, description=:desc, data_scope=:ds, "
            f"updated_by=:updated_by WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {"id": role_id, "name": name, "desc": desc, "ds": data_scope, **audit_update_params()},
            )
        if data_scope == 4 and body.custom_scopes is not None:
            await self.set_role_data_scopes(role_id, body.custom_scopes, tenant_id)
        elif data_scope != 4:
            await self.set_role_data_scopes(role_id, [], tenant_id)
        return await self.get_by_id(role_id, tenant_id)

    async def set_role_permissions(
        self, role_id: int, permissions: list[str], tenant_id: int | None = None
    ) -> RoleRecord | None:
        expanded = await self._perm_repo.expand_codes(permissions)
        await self._perm_repo.validate_codes(expanded)
        role = await self.get_by_id(role_id, tenant_id)
        if role is None:
            return None
        rp = self._role_perms(tenant_id)
        async with self._engine.begin() as conn:
            await conn.execute(text(f"DELETE FROM {rp} WHERE role_id=:id"), {"id": role_id})
            if expanded:
                insert_sql = text(
                    f"INSERT INTO {rp} (role_id, permission_code, created_by, updated_by) "
                    f"VALUES (:rid, :code, :created_by, :updated_by)"
                )
                audit = audit_insert_params()
                for code in expanded:
                    await conn.execute(insert_sql, {"rid": role_id, "code": code, **audit})
        return await self.get_by_id(role_id, tenant_id)

    async def set_role_data_scopes(
        self,
        role_id: int,
        scopes: list[RoleDataScopeItem],
        tenant_id: int | None = None,
    ) -> None:
        rs = self._role_scope(tenant_id)
        async with self._engine.begin() as conn:
            await conn.execute(text(f"DELETE FROM {rs} WHERE role_id=:id"), {"id": role_id})
            if not scopes:
                return
            insert_sql = text(
                f"INSERT INTO {rs} (role_id, scope_type, scope_id, created_by, updated_by) "
                f"VALUES (:rid, :stype, :sid, :created_by, :updated_by)"
            )
            audit = audit_insert_params()
            for item in scopes:
                await conn.execute(
                    insert_sql,
                    {
                        "rid": role_id,
                        "stype": item.scope_type,
                        "sid": item.scope_id,
                        **audit,
                    },
                )

    async def get_role_data_scopes(
        self, role_id: int, tenant_id: int | None = None
    ) -> list[RoleDataScopeItem]:
        rs = self._role_scope(tenant_id)
        sql = text(f"SELECT scope_type, scope_id FROM {rs} WHERE role_id=:id")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"id": role_id})).fetchall()
        return [
            RoleDataScopeItem(scope_type=cast(ScopeItemType, str(r[0])), scope_id=int(r[1]))
            for r in rows
        ]

    async def ensure_default_roles(self, tenant_id: int | None = None) -> None:
        tid = tenant_id or self._tid()
        await self.ensure_schema(tid)
        if await self.count_roles(tid) > 0:
            return
        for code, (name, desc, assignable) in DEFAULT_ROLE_DEFS.items():
            role = await self.create_role(
                RoleCreate(code=code, name=name, description=desc),
                tenant_id=tid,
                system_managed=True,
            )
            if code == ROLE_ADMIN:
                perms = list(tenant_admin_baseline_codes())
            else:
                perms = await self._perm_repo.expand_codes(assignable)
            await self.set_role_permissions(role.id, perms, tenant_id=tid)
        logger.info("租户 %s 已初始化默认角色: %s", tid, ", ".join(DEFAULT_ROLE_DEFS))

    async def ensure_preset_roles(
        self, tenant_id: int | None, role_codes: list[str]
    ) -> None:
        """按平台租户类型角色模板创建租户内预置角色。"""
        tid = tenant_id or self._tid()
        await self.ensure_schema(tid)
        sys_repo = SysRoleRepo(self._engine, permission_repo=self._perm_repo)
        created: list[str] = []
        for code in role_codes:
            sys_role = await sys_repo.get_by_code(code)
            if sys_role is None or sys_role.role_type != ROLE_TYPE_TENANT:
                continue
            if await self.get_by_code(code, tid) is not None:
                continue
            role = await self.create_role(
                RoleCreate(
                    code=code,
                    name=sys_role.name,
                    description=sys_role.description,
                ),
                tenant_id=tid,
                system_managed=True,
            )
            await self.set_role_permissions(role.id, list(sys_role.permissions), tenant_id=tid)
            created.append(code)
        if created:
            logger.info("租户 %s 已初始化预置角色: %s", tid, ", ".join(created))

    async def _sys_role_permissions(self, code: str) -> list[str] | None:
        sys_role = await SysRoleRepo(self._engine, permission_repo=self._perm_repo).get_by_code(
            code
        )
        if sys_role is None or sys_role.role_type != ROLE_TYPE_TENANT:
            return None
        return list(sys_role.permissions)

    async def propagate_sys_tenant_role_permissions(self, role_code: str) -> None:
        """平台租户类型角色权限变更后，同步至已绑定该角色的全部租户。"""
        template = await self._sys_role_permissions(role_code)
        if template is None:
            return
        system_role_repo = TenantSystemRoleRepo(self._engine)
        tenant_ids = await system_role_repo.list_tenant_ids_for_role(role_code)
        for tid in tenant_ids:
            biz_role = await self.get_by_code(role_code, tid)
            if biz_role is not None and list(biz_role.permissions) != template:
                await self.set_role_permissions(biz_role.id, template, tid)
            await self.sync_tenant_system_role_permissions(tid)
        if tenant_ids:
            logger.info("租户类型角色 %s 已同步至 %d 个租户", role_code, len(tenant_ids))

    async def _expand_system_role_binding_permissions(
        self, binding_codes: list[str]
    ) -> set[str]:
        """展开租户绑定的平台租户类型角色权限并集（不含 admin 基线）。"""
        permission_codes: set[str] = set()
        for code in binding_codes:
            perms = await self._sys_role_permissions(code)
            if perms is None:
                continue
            permission_codes.update(perms)
        return permission_codes

    async def sync_tenant_system_role_permissions(
        self,
        tenant_id: int | None = None,
        *,
        previous_bindings: list[str] | None = None,
    ) -> list[str]:
        """系统角色绑定变更后同步租户内角色权限。

        - 管理员：tenant.* 基线 + 当前绑定并集（全量对齐）
        - 绑定并集缩减时：租户内所有非 admin 角色移除对应权限
        - 绑定并集扩大时：非 admin 角色保持不变
        """
        tid = tenant_id or self._tid()
        system_role_repo = TenantSystemRoleRepo(self._engine)
        new_bindings = await system_role_repo.list_role_codes(tid)
        new_union = await self._expand_system_role_binding_permissions(new_bindings)
        old_union = (
            await self._expand_system_role_binding_permissions(previous_bindings)
            if previous_bindings is not None
            else set()
        )
        removed = old_union - new_union

        admin = await self.get_by_code(ROLE_ADMIN, tid)
        if admin is None:
            return await self._sync_preset_roles_permissions(
                tid,
                new_bindings,
                previous_bindings=previous_bindings,
            )

        admin_expected = sorted(
            set(tenant_admin_baseline_codes()) | new_union
        )
        current_admin = set(admin.permissions)
        await self.set_role_permissions(admin.id, admin_expected, tid)
        added = sorted(set(admin_expected) - current_admin)
        removed_from_admin = sorted(current_admin - set(admin_expected))

        if removed:
            for role in await self._list_all_roles(tid):
                if role.code == ROLE_ADMIN:
                    continue
                trimmed = sorted(set(role.permissions) - removed)
                if set(trimmed) != set(role.permissions):
                    await self.set_role_permissions(role.id, trimmed, tid)

        if added:
            logger.info("租户 %s admin 已补齐权限: %s", tid, ", ".join(added))
        if removed_from_admin:
            logger.info("租户 %s admin 已移除权限: %s", tid, ", ".join(removed_from_admin))
        if removed:
            logger.info("租户 %s 非 admin 角色已移除权限: %s", tid, ", ".join(sorted(removed)))
        return added

    async def _sync_preset_roles_permissions(
        self,
        tenant_id: int,
        new_bindings: list[str],
        *,
        previous_bindings: list[str] | None,
    ) -> list[str]:
        """无 admin 角色时：主预置角色承载 tenant.* 基线，其余按模板对齐。"""
        old_union = (
            await self._expand_system_role_binding_permissions(previous_bindings)
            if previous_bindings is not None
            else set()
        )
        new_union = await self._expand_system_role_binding_permissions(new_bindings)
        removed = old_union - new_union
        primary = _primary_preset_code(new_bindings)
        baseline = set(tenant_admin_baseline_codes())
        added_all: list[str] = []

        for code in new_bindings:
            role = await self.get_by_code(code, tenant_id)
            if role is None:
                continue
            template = await self._sys_role_permissions(code)
            if template is None:
                continue
            perms = set(template)
            if code == primary:
                perms |= baseline
            expected = sorted(perms)
            current = set(role.permissions)
            if current != set(expected):
                await self.set_role_permissions(role.id, expected, tenant_id)
                added_all.extend(sorted(set(expected) - current))

        bound_set = set(new_bindings)
        for role in await self._list_all_roles(tenant_id):
            if role.code in bound_set:
                continue
            template = await self._sys_role_permissions(role.code)
            if template is None:
                continue
            expected = sorted(set(template))
            if set(role.permissions) != set(expected):
                await self.set_role_permissions(role.id, expected, tenant_id)

        if removed:
            for role in await self._list_all_roles(tenant_id):
                if role.code == primary or role.code not in new_bindings:
                    continue
                trimmed = sorted(set(role.permissions) - removed)
                if set(trimmed) != set(role.permissions):
                    await self.set_role_permissions(role.id, trimmed, tenant_id)

        if added_all:
            logger.info(
                "租户 %s 预置角色已补齐权限: %s",
                tenant_id,
                ", ".join(sorted(set(added_all))),
            )
        if removed:
            logger.info(
                "租户 %s 非主预置角色已移除权限: %s",
                tenant_id,
                ", ".join(sorted(removed)),
            )
        return sorted(set(added_all))

    async def sync_tenant_admin_permissions(self, tenant_id: int | None = None) -> list[str]:
        """按租户绑定的系统角色并集 + tenant.* 基线同步 admin 权限。"""
        added = await self.sync_tenant_system_role_permissions(tenant_id)
        self_added = await self.ensure_self_service_permissions(tenant_id)
        return sorted(set(added) | set(self_added))

    async def ensure_self_service_permissions(
        self, tenant_id: int | None = None
    ) -> list[str]:
        """为租户内所有角色补齐个人中心权限（登录用户自助）。"""
        tid = tenant_id or self._tid()
        expanded = await self._perm_repo.expand_codes(list(tenant_self_service_codes()))
        added_all: list[str] = []
        for role in await self._list_all_roles(tid):
            merged = sorted(set(role.permissions) | set(expanded))
            if set(merged) != set(role.permissions):
                await self.set_role_permissions(role.id, merged, tid)
                added_all.extend(sorted(set(merged) - set(role.permissions)))
        return added_all

    async def sync_admin_permissions(self, tenant_id: int | None = None) -> list[str]:
        """运维脚本用：将 admin 对齐为注册表全量 enabled 权限。"""
        role = await self.get_by_code(ROLE_ADMIN, tenant_id)
        if role is None:
            raise ValueError(f"角色不存在: {ROLE_ADMIN}")
        expected = set(await self._perm_repo.list_enabled_codes())
        current = set(role.permissions)
        if current == expected:
            return []
        added = sorted(expected - current)
        removed = sorted(current - expected)
        await self.set_role_permissions(role.id, sorted(expected), tenant_id)
        if added:
            logger.info("admin 角色已补齐权限: %s", ", ".join(added))
        if removed:
            logger.info("admin 角色已移除失效权限: %s", ", ".join(removed))
        return added

    async def get_user_role_codes(
        self, user_id: int, tenant_id: int | None = None
    ) -> list[str]:
        roles_t = self._roles(tenant_id)
        ur = self._user_roles(tenant_id)
        sql = text(
            f"SELECT r.code FROM {ur} ur "
            f"JOIN {roles_t} r ON r.id=ur.role_id WHERE ur.user_id=:uid ORDER BY r.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        return [str(r[0]) for r in rows]

    async def get_user_role_summaries(
        self, user_id: int, tenant_id: int | None = None
    ) -> list[RoleSummary]:
        roles_t = self._roles(tenant_id)
        ur = self._user_roles(tenant_id)
        sql = text(
            f"SELECT r.id, r.code, r.name FROM {ur} ur "
            f"JOIN {roles_t} r ON r.id=ur.role_id WHERE ur.user_id=:uid ORDER BY r.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        return [RoleSummary(id=int(r[0]), code=str(r[1]), name=str(r[2])) for r in rows]

    async def list_user_role_summaries_batch(
        self, user_ids: list[int], tenant_id: int | None = None
    ) -> dict[int, list[RoleSummary]]:
        if not user_ids:
            return {}
        ur = self._user_roles(tenant_id)
        roles_t = self._roles(tenant_id)
        sql = text(
            f"SELECT ur.user_id, r.id, r.code, r.name FROM {ur} ur "
            f"JOIN {roles_t} r ON r.id=ur.role_id "
            f"WHERE ur.user_id IN :user_ids ORDER BY ur.user_id, r.id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"user_ids": tuple(user_ids)})).fetchall()
        grouped: dict[int, list[RoleSummary]] = {}
        for user_id, role_id, code, name in rows:
            uid = int(user_id)
            grouped.setdefault(uid, []).append(
                RoleSummary(id=int(role_id), code=str(code), name=str(name))
            )
        return grouped

    async def get_user_permissions(
        self, user_id: int, tenant_id: int | None = None
    ) -> set[str]:
        ur = self._user_roles(tenant_id)
        rp = self._role_perms(tenant_id)
        sql = text(
            f"SELECT DISTINCT rp.permission_code FROM {ur} ur "
            f"JOIN {rp} rp ON rp.role_id=ur.role_id WHERE ur.user_id=:uid"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        return {str(r[0]) for r in rows}

    async def get_user_data_scopes(
        self, user_id: int, tenant_id: int | None = None
    ) -> list[tuple[int, list[RoleDataScopeItem]]]:
        """返回用户各角色的 data_scope 与自定义范围。"""
        roles_t = self._roles(tenant_id)
        ur = self._user_roles(tenant_id)
        sql = text(
            f"SELECT r.id, r.data_scope FROM {ur} ur "
            f"JOIN {roles_t} r ON r.id=ur.role_id WHERE ur.user_id=:uid"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id})).fetchall()
        result: list[tuple[int, list[RoleDataScopeItem]]] = []
        for role_id, data_scope in rows:
            scopes: list[RoleDataScopeItem] = []
            if int(data_scope) == 4:
                scopes = await self.get_role_data_scopes(int(role_id), tenant_id)
            result.append((int(data_scope), scopes))
        return result

    async def set_user_roles(
        self, user_id: int, role_ids: list[int], tenant_id: int | None = None
    ) -> None:
        ur = self._user_roles(tenant_id)
        async with self._engine.begin() as conn:
            await conn.execute(text(f"DELETE FROM {ur} WHERE user_id=:uid"), {"uid": user_id})
            if not role_ids:
                return
            insert_sql = text(
                f"INSERT INTO {ur} (user_id, role_id, created_by, updated_by) "
                f"VALUES (:uid, :rid, :created_by, :updated_by)"
            )
            audit = audit_insert_params()
            for rid in role_ids:
                await conn.execute(insert_sql, {"uid": user_id, "rid": rid, **audit})

    async def assign_role_by_code(
        self, user_id: int, role_code: str, tenant_id: int | None = None
    ) -> None:
        role = await self.get_by_code(role_code, tenant_id)
        if role is None:
            raise ValueError(f"角色不存在: {role_code}")
        ur = self._user_roles(tenant_id)
        sql = text(
            f"INSERT IGNORE INTO {ur} (user_id, role_id, created_by, updated_by) "
            f"VALUES (:uid, :rid, :created_by, :updated_by)"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql, {"uid": user_id, "rid": role.id, **audit_insert_params()}
            )

    async def _role_permissions(
        self, role_id: int, tenant_id: int | None = None
    ) -> list[str]:
        perm_map = await self._role_permissions_map([role_id], tenant_id)
        return perm_map.get(role_id, [])

    async def _role_permissions_map(
        self, role_ids: list[int], tenant_id: int | None = None
    ) -> dict[int, list[str]]:
        if not role_ids:
            return {}
        rp = self._role_perms(tenant_id)
        sql = text(
            f"SELECT role_id, permission_code FROM {rp} "
            f"WHERE role_id IN :role_ids ORDER BY role_id, permission_code"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"role_ids": tuple(role_ids)})).fetchall()
        grouped: dict[int, list[str]] = {}
        for role_id, code in rows:
            grouped.setdefault(int(role_id), []).append(str(code))
        return grouped
