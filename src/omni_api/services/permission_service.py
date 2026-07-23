"""RBAC 权限查询与默认角色引导。"""

from __future__ import annotations

import time

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.permission_repo import PermissionRepo
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.sys_role_repo import SysRoleRepo
from omni_api.data.mysql.sys_schema import ensure_sys_schema
from omni_api.data.mysql.tenant_context import get_session, get_tenant_id, resolve_tenant_id
from omni_api.schemas.rbac import PermissionInfo
from omni_api.services.effective_permissions import resolve_user_permissions

from omni_api.auth.permission_catalog_scope import (
    assignment_excluded_catalogs_for_role_type,
)
from omni_api.schemas.sys_role_type import ROLE_TYPE_SYSTEM, ROLE_TYPE_TENANT


class PermissionService:
    """用户权限与角色服务。"""

    _cache_ttl_sec = 60.0
    _tree_cache: tuple[float, list[dict]] | None = None
    _nav_cache: tuple[float, list[dict]] | None = None

    def __init__(
        self,
        role_repo: RoleRepo | None = None,
        permission_repo: PermissionRepo | None = None,
        tenant_id: int | None = None,
    ) -> None:
        engine = mysql_engine()
        self._tenant_id = tenant_id if tenant_id is not None else get_tenant_id()
        self._engine = engine
        if role_repo is not None:
            self._role_repo = role_repo
        elif self._tenant_id is not None:
            self._role_repo = RoleRepo(engine, tenant_id=self._tenant_id)
        else:
            self._role_repo = RoleRepo(engine)
        self._perm_repo = permission_repo or PermissionRepo(engine)

    def _require_tenant_id(self) -> int:
        return resolve_tenant_id(explicit=self._tenant_id)

    @classmethod
    def invalidate_cache(cls) -> None:
        """权限变更后清除内存缓存。"""
        cls._tree_cache = None
        cls._nav_cache = None
        PermissionRepo.invalidate_route_index_cache()

    async def ensure_platform_schema(self) -> None:
        """系统权限与平台角色表（不含租户分表）。"""
        await ensure_sys_schema(self._engine)
        await self._perm_repo.ensure_schema()
        await SysRoleRepo(self._engine).ensure_schema()

    async def ensure_schema(self) -> None:
        await self.ensure_platform_schema()
        tid = self._tenant_id or get_tenant_id()
        if tid is not None:
            await RoleRepo(self._engine, tenant_id=tid).ensure_schema(tid)

    async def ensure_default_permissions(self) -> None:
        await self._perm_repo.ensure_default_permissions()
        self.invalidate_cache()

    async def sync_permissions(self) -> list[str]:
        added = await self._perm_repo.sync_permissions()
        self.invalidate_cache()
        return added

    async def ensure_default_roles(self) -> None:
        await SysRoleRepo(self._engine).ensure_default_roles()
        tid = self._require_tenant_id()
        await RoleRepo(self._engine, tenant_id=tid).ensure_default_roles(tid)

    async def sync_admin_permissions(self) -> list[str]:
        tid = self._require_tenant_id()
        result = await RoleRepo(self._engine, tenant_id=tid).sync_admin_permissions(tid)
        self.invalidate_cache()
        return result

    async def get_user_permissions(self, user_id: int, tenant_id: int | None = None) -> set[str]:
        session = get_session()
        if session and int(session.get("user_id", -1)) == user_id:
            tid = tenant_id or session.get("tenant_id")
            if tid == (tenant_id or self._tenant_id) and session.get("permissions"):
                return set(session["permissions"])
        tid = tenant_id if tenant_id is not None else self._tenant_id
        _, perms = await resolve_user_permissions(
            self._engine, user_id, tid
        )
        return perms

    async def user_has_permission(
        self, user_id: int, code: str, tenant_id: int | None = None
    ) -> bool:
        session = get_session()
        if session and int(session.get("user_id", -1)) == user_id:
            if session.get("need_tenant_select"):
                return code in {"auth.switch_tenant", "auth.tenants"}
            if session.get("permissions"):
                return code in session["permissions"]
        perms = await self.get_user_permissions(user_id, tenant_id)
        return code in perms

    async def get_user_role_codes(self, user_id: int, tenant_id: int | None = None) -> list[str]:
        tid = tenant_id if tenant_id is not None else self._tenant_id
        if tid is None:
            return []
        return await RoleRepo(self._engine, tenant_id=tid).get_user_role_codes(user_id, tid)

    async def _cached_tree(self, *, assignable_only: bool) -> list[dict]:
        now = time.monotonic()
        if assignable_only and self._tree_cache is not None:
            ts, cached = self._tree_cache
            if now - ts < self._cache_ttl_sec:
                return cached
        if not assignable_only and self._nav_cache is not None:
            ts, cached = self._nav_cache
            if now - ts < self._cache_ttl_sec:
                return cached
        if assignable_only:
            tree = await self._perm_repo.build_tree(
                assignable_only=True,
                enabled_only=True,
            )
            PermissionService._tree_cache = (now, tree)
            return tree
        tree = await self._perm_repo.build_nav_tree()
        PermissionService._nav_cache = (now, tree)
        return tree

    @staticmethod
    def _to_permission_info(raw: dict) -> PermissionInfo:
        return PermissionInfo(
            id=raw.get("id"),
            code=raw["code"],
            name=raw["name"],
            kind=raw["kind"],
            parent_id=raw.get("parent_id"),
            sort_order=raw.get("sort_order", 0),
            enabled=raw.get("enabled", True),
            route_path=raw.get("route_path"),
            component_key=raw.get("component_key"),
            api_codes=raw.get("api_codes", []),
            children=[PermissionService._to_permission_info(c) for c in raw["children"]],
        )

    async def list_permission_tree(self) -> list[PermissionInfo]:
        tree = await self._cached_tree(assignable_only=True)
        return [self._to_permission_info(n) for n in tree]

    async def list_tenant_permission_tree(self) -> list[PermissionInfo]:
        """租户角色可分配的权限树（仅租户目录：训练、设置、订单）。"""
        full = await self.list_permission_tree()
        return self._filter_assignment_tree(
            full,
            excluded_catalogs=assignment_excluded_catalogs_for_role_type(ROLE_TYPE_TENANT),
            excluded_code_prefix="system.",
        )

    async def list_system_permission_tree(self) -> list[PermissionInfo]:
        """平台系统角色可分配的权限树（仅系统目录：系统、平台管理）。"""
        full = await self.list_permission_tree()
        return self._filter_assignment_tree(
            full,
            excluded_catalogs=assignment_excluded_catalogs_for_role_type(ROLE_TYPE_SYSTEM),
            excluded_code_prefix="tenant.",
        )

    @staticmethod
    def _filter_assignment_tree(
        nodes: list[PermissionInfo],
        *,
        excluded_catalogs: frozenset[str],
        excluded_code_prefix: str,
    ) -> list[PermissionInfo]:
        """按域边界裁剪分配树：保留全部可分配目录/菜单，仅排除跨域目录与前缀权限。"""
        out: list[PermissionInfo] = []
        for node in nodes:
            if node.code.startswith(excluded_code_prefix):
                continue
            if node.kind == "catalog" and node.code in excluded_catalogs:
                continue
            children = PermissionService._filter_assignment_tree(
                node.children,
                excluded_catalogs=excluded_catalogs,
                excluded_code_prefix=excluded_code_prefix,
            )
            out.append(node.model_copy(update={"children": children}))
        return out

    async def list_nav_tree(self) -> list[PermissionInfo]:
        session = get_session()
        tree = await self._cached_tree(assignable_only=False)
        if session and not session.get("need_tenant_select"):
            user_id = int(session["user_id"])
            tid = session.get("tenant_id")
            if tid is not None:
                _, allowed = await resolve_user_permissions(
                    self._engine, user_id, int(tid)
                )
            else:
                _, allowed = await resolve_user_permissions(
                    self._engine, user_id, None
                )

            def filter_nav(nodes: list[dict]) -> list[dict]:
                out: list[dict] = []
                for n in nodes:
                    children = filter_nav(n.get("children") or [])
                    if n["code"] in allowed or children:
                        copied = dict(n)
                        copied["children"] = children
                        out.append(copied)
                out.sort(key=lambda c: (c["sort_order"], c["id"]))
                return out

            tree = filter_nav(tree)
        return [self._to_permission_info(n) for n in tree]

    async def resolve_api_permission(self, method: str, path: str) -> str | None:
        return await self._perm_repo.resolve_api_permission(method, path)
