"""数据权限守卫：列表 SQL 片段与单条可见性校验。"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.tenant_context import get_dept_id
from omni_api.services.data_scope_service import DataScopeFilter


class DataScopeGuard:
    """封装 DataScopeFilter，供仓储与 API 复用。"""

    def __init__(self, engine: AsyncEngine, tenant_id: int | None = None) -> None:
        self._filter = DataScopeFilter(engine, tenant_id=tenant_id)

    async def visible_sets(self) -> tuple[set[int] | None, set[int] | None]:
        return await self._filter.resolve_visible()

    async def scope_where(
        self,
        *,
        dept_column: str | None = "dept_id",
        user_column: str = "created_by",
        prefix: str = "",
    ) -> tuple[str, dict[str, object]]:
        dept_ids, user_ids = await self._filter.resolve_visible()
        clause, params = self._filter.build_where_clause(
            dept_ids,
            user_ids,
            dept_column=dept_column,
            user_column=user_column,
        )
        if not clause:
            return "", {}
        if prefix:
            clause = f"{prefix}{clause}"
        return clause, params

    @staticmethod
    def can_access(
        dept_id: int | None,
        created_by: int | None,
        dept_ids: set[int],
        user_ids: set[int],
        *,
        subject_user_id: int | None = None,
    ) -> bool:
        if subject_user_id is not None and subject_user_id in user_ids:
            return True
        if dept_id is not None and dept_id in dept_ids:
            return True
        if created_by is not None and created_by in user_ids:
            return True
        return False

    async def assert_access(
        self,
        *,
        dept_id: int | None = None,
        created_by: int | None = None,
        subject_user_id: int | None = None,
    ) -> None:
        dept_ids, user_ids = await self.visible_sets()
        if dept_ids is None and user_ids is None:
            return
        if not self.can_access(
            dept_id,
            created_by,
            dept_ids or set(),
            user_ids or set(),
            subject_user_id=subject_user_id,
        ):
            raise HTTPException(status_code=404, detail="资源不存在")

    async def tenant_user_clause(self, user_alias: str = "u", binding_alias: str = "ut") -> tuple[str, dict[str, object]]:
        """租户用户列表：部门绑定或用户本人/创建人。"""
        dept_ids, user_ids = await self.visible_sets()
        if dept_ids is None and user_ids is None:
            return "", {}
        if not dept_ids and not user_ids:
            return "1=0", {}
        parts: list[str] = []
        params: dict[str, object] = {}
        if dept_ids:
            parts.append(f"{binding_alias}.dept_id IN :scope_dept_ids")
            params["scope_dept_ids"] = tuple(dept_ids)
        if user_ids:
            parts.append(f"{user_alias}.id IN :scope_user_ids")
            parts.append(f"{user_alias}.created_by IN :scope_user_ids")
            params["scope_user_ids"] = tuple(user_ids)
        return f"({' OR '.join(parts)})", params

    async def dept_ids_clause(self, column: str = "id") -> tuple[str, dict[str, object]]:
        dept_ids, user_ids = await self.visible_sets()
        if dept_ids is None and user_ids is None:
            return "", {}
        if dept_ids:
            return f"{column} IN :scope_dept_ids", {"scope_dept_ids": tuple(dept_ids)}
        if user_ids:
            did = get_dept_id()
            if did is not None:
                return f"{column} IN :scope_dept_ids", {"scope_dept_ids": (did,)}
        return "1=0", {}
