"""部门 MySQL 仓储（租户物理分表）。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.actor import get_actor_id
from omni_api.data.mysql.biz_table import SYS_USER_TENANT, biz_table
from omni_api.schemas.tenant import DeptCreate, DeptRecord, DeptUpdate
from omni_api.services.data_scope_guard import DataScopeGuard


def _row_to_dept(row: Sequence[Any]) -> DeptRecord:
    return DeptRecord(
        id=int(row[0]),
        parent_id=int(row[1]),
        name=str(row[2]),
        sort_order=int(row[3]),
        enabled=bool(row[4]),
    )


class DeptRepo:
    """租户内部门树 CRUD。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    def _table(self, tenant_id: int) -> str:
        return biz_table("dept", tenant_id)

    def _role_data_scope_table(self, tenant_id: int) -> str:
        return biz_table("role_data_scope", tenant_id)

    def _user_data_scope_table(self, tenant_id: int) -> str:
        return biz_table("user_data_scope", tenant_id)

    async def _validate_parent(
        self,
        tenant_id: int,
        dept_id: int | None,
        parent_id: int,
    ) -> None:
        """校验上级部门合法且不会形成环。"""
        if parent_id == 0:
            await self._validate_single_root(tenant_id, dept_id, parent_id)
            return
        if dept_id is not None and parent_id == dept_id:
            raise ValueError("上级部门不能是自身")
        parent = await self.get_by_id(tenant_id, parent_id)
        if parent is None:
            raise ValueError("上级部门不存在")
        if dept_id is not None:
            descendants = await self.list_descendant_ids(tenant_id, dept_id)
            if parent_id in descendants:
                raise ValueError("上级部门不能是当前部门的子部门")

    async def _validate_single_root(
        self,
        tenant_id: int,
        dept_id: int | None,
        parent_id: int,
    ) -> None:
        """租户仅允许一个顶级部门（parent_id=0）。"""
        if parent_id != 0:
            return
        flat = await self._list_all_flat(tenant_id)
        roots = [d for d in flat if d.parent_id == 0]
        if dept_id is None:
            if roots:
                raise ValueError("租户只能有一个顶级部门")
            return
        current = next((d for d in flat if d.id == dept_id), None)
        if current is None:
            return
        if current.parent_id == 0:
            return
        if roots:
            raise ValueError("租户只能有一个顶级部门")

    async def list_flat(self, tenant_id: int) -> list[DeptRecord]:
        """租户部门平铺列表：固定应用数据权限。"""
        t = self._table(tenant_id)
        where = ""
        params: dict[str, object] = {}
        guard = DataScopeGuard(self._engine, tenant_id=tenant_id)
        clause, scope_params = await guard.dept_ids_clause("id")
        if clause:
            where = f" WHERE {clause}"
            params.update(scope_params)
        sql = text(
            f"SELECT id, parent_id, name, sort_order, enabled FROM {t}{where} "
            f"ORDER BY parent_id, sort_order, id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, params)).fetchall()
        return [_row_to_dept(r) for r in rows]

    async def _list_all_flat(self, tenant_id: int) -> list[DeptRecord]:
        """租户内全部部门（树组装/校验用，不走数据权限）。"""
        t = self._table(tenant_id)
        sql = text(
            f"SELECT id, parent_id, name, sort_order, enabled FROM {t} "
            f"ORDER BY parent_id, sort_order, id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_dept(r) for r in rows]

    async def _all_flat(self, tenant_id: int) -> list[DeptRecord]:
        return await self._list_all_flat(tenant_id)

    @staticmethod
    def _expand_with_ancestors(
        visible: list[DeptRecord], all_by_id: dict[int, DeptRecord]
    ) -> list[DeptRecord]:
        """补齐可见部门的祖先节点，以便组装树形结构。"""
        if not visible:
            return visible
        needed: dict[int, DeptRecord] = {d.id: d for d in visible}
        for dept in visible:
            parent_id = dept.parent_id
            while parent_id != 0 and parent_id not in needed:
                parent = all_by_id.get(parent_id)
                if parent is None:
                    break
                needed[parent.id] = parent
                parent_id = parent.parent_id
        return list(needed.values())

    def _build_tree(self, flat: list[DeptRecord]) -> list[DeptRecord]:
        by_parent: dict[int, list[DeptRecord]] = {}
        nodes: dict[int, DeptRecord] = {}
        for d in flat:
            nodes[d.id] = d.model_copy(deep=True)
            by_parent.setdefault(d.parent_id, []).append(nodes[d.id])
        for pid, children in by_parent.items():
            if pid in nodes:
                nodes[pid].children = children
        return by_parent.get(0, [])

    async def list_tree(self, tenant_id: int) -> list[DeptRecord]:
        flat = await self._list_all_flat(tenant_id)
        if flat:
            all_by_id = {d.id: d for d in await self._all_flat(tenant_id)}
            flat = self._expand_with_ancestors(flat, all_by_id)
        return self._build_tree(flat)

    async def get_by_id(self, tenant_id: int, dept_id: int) -> DeptRecord | None:
        t = self._table(tenant_id)
        sql = text(
            f"SELECT id, parent_id, name, sort_order, enabled FROM {t} WHERE id=:id"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": dept_id})).fetchone()
        return _row_to_dept(row) if row else None

    async def create(self, tenant_id: int, body: DeptCreate) -> DeptRecord:
        if not body.name.strip():
            raise ValueError("部门名称不能为空")
        if body.parent_id == 0 and not body.enabled:
            raise ValueError("顶级部门不可禁用")
        await self._validate_parent(tenant_id, None, body.parent_id)
        t = self._table(tenant_id)
        actor = get_actor_id()
        sql = text(
            f"INSERT INTO {t} (parent_id, name, sort_order, enabled, created_by, updated_by) "
            f"VALUES (:pid, :name, :sort, :en, :cb, :ub)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql,
                {
                    "pid": body.parent_id,
                    "name": body.name.strip(),
                    "sort": body.sort_order,
                    "en": int(body.enabled),
                    "cb": actor,
                    "ub": actor,
                },
            )
            dept_id = int(result.lastrowid)
        dept = await self.get_by_id(tenant_id, dept_id)
        assert dept is not None
        return dept

    async def update(
        self, tenant_id: int, dept_id: int, body: DeptUpdate
    ) -> DeptRecord | None:
        current = await self.get_by_id(tenant_id, dept_id)
        if current is None:
            return None
        if body.name is not None and not body.name.strip():
            raise ValueError("部门名称不能为空")
        parent_id = body.parent_id if body.parent_id is not None else current.parent_id
        name = body.name.strip() if body.name is not None else current.name
        sort_order = body.sort_order if body.sort_order is not None else current.sort_order
        enabled = body.enabled if body.enabled is not None else current.enabled
        if current.parent_id == 0:
            if parent_id != 0:
                raise ValueError("顶级部门不能变更为子部门")
            if body.enabled is not None and not body.enabled:
                raise ValueError("顶级部门不可禁用")
            enabled = True
        await self._validate_parent(tenant_id, dept_id, parent_id)
        actor = get_actor_id()
        t = self._table(tenant_id)
        sql = text(
            f"UPDATE {t} SET parent_id=:pid, name=:name, sort_order=:sort, "
            f"enabled=:en, updated_by=:ub WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "id": dept_id,
                    "pid": parent_id,
                    "name": name,
                    "sort": sort_order,
                    "en": int(enabled),
                    "ub": actor,
                },
            )
        return await self.get_by_id(tenant_id, dept_id)

    async def delete(self, tenant_id: int, dept_id: int) -> bool:
        """删除部门；存在子部门、用户绑定或角色数据范围引用时拒绝。"""
        current = await self.get_by_id(tenant_id, dept_id)
        if current is None:
            return False
        if current.parent_id == 0:
            raise ValueError("顶级部门不能删除")

        flat = await self._list_all_flat(tenant_id)
        if any(d.parent_id == dept_id for d in flat):
            raise ValueError("存在子部门，无法删除")

        user_sql = text(
            f"SELECT 1 FROM {SYS_USER_TENANT} "
            f"WHERE tenant_id=:tid AND dept_id=:did LIMIT 1"
        )
        scope_sql = text(
            f"SELECT 1 FROM {self._role_data_scope_table(tenant_id)} "
            f"WHERE scope_type='dept' AND scope_id=:did LIMIT 1"
        )
        user_scope_sql = text(
            f"SELECT 1 FROM {self._user_data_scope_table(tenant_id)} "
            f"WHERE scope_type='dept' AND scope_id=:did LIMIT 1"
        )
        async with self._engine.connect() as conn:
            user_row = (
                await conn.execute(user_sql, {"tid": tenant_id, "did": dept_id})
            ).fetchone()
            if user_row is not None:
                raise ValueError("仍有用户绑定该部门，无法删除")
            scope_row = (await conn.execute(scope_sql, {"did": dept_id})).fetchone()
            if scope_row is not None:
                raise ValueError("该部门已被角色数据权限引用，无法删除")
            user_scope_row = (await conn.execute(user_scope_sql, {"did": dept_id})).fetchone()
            if user_scope_row is not None:
                raise ValueError("该部门已被用户数据权限引用，无法删除")

        delete_sql = text(f"DELETE FROM {self._table(tenant_id)} WHERE id=:id")
        async with self._engine.begin() as conn:
            await conn.execute(delete_sql, {"id": dept_id})
        return True

    async def list_descendant_ids(self, tenant_id: int, dept_id: int) -> list[int]:
        """返回部门自身及所有子孙部门 ID。"""
        flat = await self._list_all_flat(tenant_id)
        children_map: dict[int, list[int]] = {}
        for d in flat:
            children_map.setdefault(d.parent_id, []).append(d.id)
        result: list[int] = []
        stack = [dept_id]
        while stack:
            current = stack.pop()
            result.append(current)
            stack.extend(children_map.get(current, []))
        return result
