"""数据权限范围解析。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.tenant_context import get_dept_id, get_context_user_id, get_tenant_id


class DataScopeFilter:
    """解析当前用户可见的部门与用户 ID 集合。"""

    def __init__(self, engine: AsyncEngine, tenant_id: int | None = None) -> None:
        self._engine = engine
        self._tenant_id = tenant_id

    def _roles(self):
        from omni_api.data.mysql.role_repo import RoleRepo

        return RoleRepo(self._engine, tenant_id=self._tenant_id)

    def _depts(self):
        from omni_api.data.mysql.dept_repo import DeptRepo

        return DeptRepo(self._engine)

    def _tenants(self):
        from omni_api.data.mysql.tenant_repo import TenantRepo

        return TenantRepo(self._engine)

    def _tid(self) -> int:
        tid = self._tenant_id or get_tenant_id()
        if tid is None:
            raise ValueError("未选择租户")
        return tid

    async def resolve_visible(
        self, user_id: int | None = None, dept_id: int | None = None
    ) -> tuple[set[int] | None, set[int] | None]:
        """
        返回 (visible_dept_ids, visible_user_ids)。
        None 表示不限制（平台超管）。
        """
        uid = user_id if user_id is not None else get_context_user_id()
        if uid is None:
            return None, None
        tid = self._tenant_id or get_tenant_id()
        if tid is None:
            return None, None
        did = dept_id if dept_id is not None else get_dept_id()
        role_scopes = await self._roles().get_user_data_scopes(uid, tid)
        binding = await self._tenants().get_user_binding(uid, tid)
        scopes_to_merge = list(role_scopes)
        if binding is not None:
            scopes_to_merge.append((binding.data_scope, binding.custom_scopes))
        if not scopes_to_merge:
            return {did} if did else set(), {uid}
        # admin 角色 data_scope 可由业务跳过；此处按角色合并
        dept_ids: set[int] = set()
        user_ids: set[int] = set()
        unlimited = False
        for data_scope, custom in scopes_to_merge:
            if data_scope == 1:
                user_ids.add(uid)
            elif data_scope == 2:
                if did is not None:
                    dept_ids.add(did)
            elif data_scope == 3:
                if did is not None:
                    dept_ids.update(await self._depts().list_descendant_ids(tid, did))
            elif data_scope == 4:
                for item in custom:
                    if item.scope_type == "dept":
                        dept_ids.add(item.scope_id)
                        dept_ids.update(
                            await self._depts().list_descendant_ids(tid, item.scope_id)
                        )
                    else:
                        user_ids.add(item.scope_id)
        if unlimited:
            return None, None
        if not dept_ids and not user_ids:
            user_ids.add(uid)
        return dept_ids, user_ids

    def build_where_clause(
        self,
        dept_ids: set[int] | None,
        user_ids: set[int] | None,
        *,
        dept_column: str | None = "dept_id",
        user_column: str = "created_by",
    ) -> tuple[str, dict[str, object]]:
        """生成 SQL WHERE 片段与参数。无 dept 列时传 dept_column=None。"""
        if dept_ids is None and user_ids is None:
            return "", {}
        parts: list[str] = []
        params: dict[str, object] = {}
        if dept_ids and dept_column:
            parts.append(f"{dept_column} IN :dept_ids")
            params["dept_ids"] = tuple(dept_ids)
        if user_ids:
            parts.append(f"{user_column} IN :user_ids")
            params["user_ids"] = tuple(user_ids)
        if not parts:
            return "1=0", {}
        return f"({' OR '.join(parts)})", params
