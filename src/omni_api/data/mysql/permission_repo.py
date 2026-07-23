"""权限定义 MySQL 仓储。"""

from __future__ import annotations

import logging
import time

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.auth.permission_seed import PERMISSION_SEEDS
from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.permission_path import ApiRouteRow, match_path_pattern
from omni_api.data.mysql.permission_seed_sync import (
    insert_seed_batch,
    run_seed_sync,
)
from omni_api.data.mysql.biz_table import (
    SYS_PERMISSION_API_BINDINGS,
    SYS_PERMISSION_API_ROUTES,
    SYS_PERMISSIONS,
)
from omni_api.data.mysql.permission_tree import build_permission_tree_nodes
from omni_api.data.mysql.permission_sql import (
    CREATE_PERMISSIONS_SQL,
    PERMISSION_SELECT,
    row_to_permission,
)
from omni_api.data.mysql.ddl_exec import execute_create_table_if_missing

_P = SYS_PERMISSIONS
_B = SYS_PERMISSION_API_BINDINGS
_R = SYS_PERMISSION_API_ROUTES
from omni_api.schemas.rbac import (
    PermissionBindingsPatch,
    PermissionCreate,
    PermissionRecord,
    PermissionUpdate,
)

logger = logging.getLogger(__name__)


class PermissionRepo:
    """权限定义、绑定与 API 路径映射仓储。"""

    _route_index_cache: tuple[float, list[ApiRouteRow]] | None = None
    _route_index_ttl_sec = 60.0

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    @classmethod
    def invalidate_route_index_cache(cls) -> None:
        cls._route_index_cache = None

    async def ensure_schema(self) -> None:
        async with self._engine.begin() as conn:
            for stmt in CREATE_PERMISSIONS_SQL.strip().split(";"):
                s = stmt.strip()
                if s:
                    await execute_create_table_if_missing(conn, s)

    async def count_permissions(self) -> int:
        sql = text(f"SELECT COUNT(*) FROM {_P}")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql)).fetchone()
        return int(row[0]) if row else 0

    async def ensure_default_permissions(self) -> None:
        if await self.count_permissions() > 0:
            await self.sync_permissions()
            return
        await insert_seed_batch(self._engine, PERMISSION_SEEDS)
        await run_seed_sync(self._engine)
        logger.info("已初始化权限种子，共 %d 项", len(PERMISSION_SEEDS))

    async def sync_permissions(self) -> list[str]:
        return await run_seed_sync(self._engine)

    async def list_all(self, *, include_disabled: bool = True) -> list[PermissionRecord]:
        where = "" if include_disabled else " WHERE enabled = 1"
        sql = text(f"{PERMISSION_SELECT}{where} ORDER BY sort_order ASC, id ASC")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [row_to_permission(r) for r in rows]

    async def list_enabled_codes(self) -> list[str]:
        sql = text(f"SELECT code FROM {_P} WHERE enabled = 1 ORDER BY code")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [str(r[0]) for r in rows]

    async def get_by_id(self, perm_id: int) -> PermissionRecord | None:
        sql = text(f"{PERMISSION_SELECT} WHERE id = :id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": perm_id})).fetchone()
        return row_to_permission(row) if row else None

    async def get_by_code(self, code: str) -> PermissionRecord | None:
        sql = text(f"{PERMISSION_SELECT} WHERE code = :code")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"code": code})).fetchone()
        return row_to_permission(row) if row else None

    async def create(self, body: PermissionCreate) -> PermissionRecord:
        if body.kind in ("button", "api"):
            raise ValueError("按钮与接口权限由代码种子同步，不可手动创建")
        if await self.get_by_code(body.code) is not None:
            raise ValueError(f"权限码已存在: {body.code}")
        if body.parent_id is not None and await self.get_by_id(body.parent_id) is None:
            raise ValueError(f"父权限不存在: {body.parent_id}")
        sql = text(
            f"INSERT INTO {_P} "
            "(code, name, kind, parent_id, sort_order, enabled, route_path, "
            "component_key, api_method, api_path_pattern, description, is_system, "
            "created_by, updated_by) "
            "VALUES (:code, :name, :kind, :parent_id, :sort_order, :enabled, "
            ":route_path, :component_key, :api_method, :api_path_pattern, "
            ":description, 0, :created_by, :updated_by)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql,
                {
                    "code": body.code,
                    "name": body.name,
                    "kind": body.kind,
                    "parent_id": body.parent_id,
                    "sort_order": body.sort_order,
                    "enabled": 1 if body.enabled else 0,
                    "route_path": body.route_path,
                    "component_key": body.component_key,
                    "api_method": body.api_method,
                    "api_path_pattern": body.api_path_pattern,
                    "description": body.description,
                    **audit_insert_params(),
                },
            )
            perm_id = int(result.lastrowid)
        record = await self.get_by_id(perm_id)
        assert record is not None
        return record

    async def update(self, perm_id: int, body: PermissionUpdate) -> PermissionRecord | None:
        current = await self.get_by_id(perm_id)
        if current is None:
            return None
        if body.parent_id is not None and body.parent_id != current.parent_id:
            if current.kind != "menu":
                raise ValueError("仅菜单支持调整所属目录")
            if body.parent_id == perm_id:
                raise ValueError("父权限不能为自身")
            parent = await self.get_by_id(body.parent_id)
            if parent is None:
                raise ValueError(f"父权限不存在: {body.parent_id}")
            if parent.kind != "catalog":
                raise ValueError("菜单仅可移动到目录下")
        fields: dict[str, object] = {}
        if body.name is not None:
            fields["name"] = body.name
        if body.parent_id is not None and body.parent_id != current.parent_id:
            fields["parent_id"] = body.parent_id
        if body.sort_order is not None:
            fields["sort_order"] = body.sort_order
        if not fields:
            return current
        set_clause = ", ".join(f"{k}=:{k}" for k in fields)
        sql = text(
            f"UPDATE {_P} SET {set_clause}, updated_by=:updated_by WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {"id": perm_id, **fields, **audit_update_params()},
            )
        return await self.get_by_id(perm_id)

    async def delete(self, perm_id: int) -> bool:
        current = await self.get_by_id(perm_id)
        if current is None:
            return False
        if current.kind in ("button", "api"):
            raise ValueError("按钮与接口权限由代码种子同步，不可手动删除")
        if current.is_system:
            raise ValueError("系统权限不可删除")
        child_sql = text(f"SELECT COUNT(*) FROM {_P} WHERE parent_id = :id")
        role_count = await self.count_role_references(current.code)
        async with self._engine.connect() as conn:
            child_count = int((await conn.execute(child_sql, {"id": perm_id})).scalar_one())
        if child_count > 0:
            raise ValueError("存在子权限，无法删除")
        if role_count > 0:
            raise ValueError("权限已被角色引用，无法删除")
        async with self._engine.begin() as conn:
            await conn.execute(text(f"DELETE FROM {_P} WHERE id = :id"), {"id": perm_id})
        return True

    async def get_api_bindings(self, perm_id: int) -> list[str]:
        sql = text(
            f"SELECT p.code FROM {_B} b "
            f"JOIN {_P} p ON p.id = b.api_permission_id "
            "WHERE b.permission_id = :id ORDER BY p.code"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"id": perm_id})).fetchall()
        return [str(r[0]) for r in rows]

    async def set_api_bindings_by_codes(
        self, perm_id: int, body: PermissionBindingsPatch
    ) -> PermissionRecord | None:
        current = await self.get_by_id(perm_id)
        if current is None:
            return None
        raise ValueError("接口绑定由代码种子同步，不可手动修改")

    async def load_bindings_map(self) -> dict[str, list[str]]:
        sql = text(
            f"SELECT parent.code, api.code FROM {_B} b "
            f"JOIN {_P} parent ON parent.id = b.permission_id "
            f"JOIN {_P} api ON api.id = b.api_permission_id "
            "ORDER BY parent.code, api.code"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        result: dict[str, list[str]] = {}
        for parent_code, api_code in rows:
            result.setdefault(str(parent_code), []).append(str(api_code))
        return result

    async def expand_codes(self, codes: list[str]) -> list[str]:
        bindings = await self.load_bindings_map()
        all_codes = {p.code for p in await self.list_all()}
        expanded: set[str] = set()
        for code in codes:
            if code not in all_codes:
                continue
            expanded.add(code)
            expanded.update(bindings.get(code, []))
        return sorted(expanded)

    async def expand_nav_codes(self, codes: set[str]) -> set[str]:
        """根据 API 权限码反推可见的目录/菜单权限码（供 /nav、/me 使用）。"""
        if not codes:
            return set()
        perms = await self.list_all(include_disabled=False)
        code_to_perm = {p.code: p for p in perms}
        id_to_perm = {p.id: p for p in perms if p.id is not None}
        bindings = await self.load_bindings_map()

        expanded = set(codes)
        for menu_code, api_list in bindings.items():
            if any(api in codes for api in api_list):
                expanded.add(menu_code)

        ancestors: set[str] = set()
        for code in list(expanded):
            perm = code_to_perm.get(code)
            if perm is None:
                continue
            pid = perm.parent_id
            while pid is not None and pid in id_to_perm:
                parent = id_to_perm[pid]
                ancestors.add(parent.code)
                pid = parent.parent_id
        expanded |= ancestors
        return expanded

    async def validate_codes(self, codes: list[str]) -> None:
        if not codes:
            return
        all_codes = {p.code for p in await self.list_all()}
        unknown = [c for c in codes if c not in all_codes]
        if unknown:
            raise ValueError(f"未知权限码: {', '.join(unknown)}")

    async def build_tree(
        self,
        *,
        assignable_only: bool = True,
        enabled_only: bool = False,
    ) -> list[dict]:
        perms = await self.list_all(include_disabled=not enabled_only)
        if enabled_only:
            perms = [p for p in perms if p.enabled]
        bindings = await self.load_bindings_map()
        return build_permission_tree_nodes(
            perms, bindings, assignable_only=assignable_only, enabled_only=enabled_only
        )

    async def build_nav_tree(self) -> list[dict]:
        perms = await self.list_all(include_disabled=False)
        bindings = await self.load_bindings_map()
        return build_permission_tree_nodes(
            perms, bindings, assignable_only=False, nav_only=True
        )

    async def load_api_route_index(self) -> list[ApiRouteRow]:
        now = time.monotonic()
        if PermissionRepo._route_index_cache is not None:
            ts, cached = PermissionRepo._route_index_cache
            if now - ts < PermissionRepo._route_index_ttl_sec:
                return cached
        sql = text(
            "SELECT p.code, r.api_method, r.api_path_pattern "
            f"FROM {_R} r "
            f"JOIN {_P} p ON p.id = r.permission_id "
            "WHERE p.enabled = 1"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        index = [
            ApiRouteRow(
                code=str(r[0]),
                method=str(r[1]).upper(),
                pattern=str(r[2]),
                pattern_len=len(str(r[2])),
            )
            for r in rows
        ]
        index.sort(key=lambda x: x.pattern_len, reverse=True)
        PermissionRepo._route_index_cache = (now, index)
        return index

    async def resolve_api_permission(self, method: str, path: str) -> str | None:
        method_u = method.upper()
        for row in await self.load_api_route_index():
            if row.method != method_u:
                continue
            if match_path_pattern(row.pattern, path):
                return row.code
        return None

    async def count_role_references(self, code: str) -> int:
        tables_sql = text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = DATABASE() AND table_name LIKE 't_biz_role_permissions_%'"
        )
        async with self._engine.connect() as conn:
            tables = [str(r[0]) for r in (await conn.execute(tables_sql)).fetchall()]
            total = 0
            for table in tables:
                row = (
                    await conn.execute(
                        text(f"SELECT COUNT(*) FROM `{table}` WHERE permission_code = :code"),
                        {"code": code},
                    )
                ).fetchone()
                total += int(row[0]) if row else 0
        return total
