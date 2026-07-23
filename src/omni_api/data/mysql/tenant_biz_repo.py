"""租户业务仓储基类。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_table import biz_table
from omni_api.data.mysql.tenant_context import get_tenant_id
from omni_api.services.data_scope_service import DataScopeFilter


class TenantBizRepo:
    """动态表名 + 数据权限 WHERE 注入基类。"""

    def __init__(self, engine: AsyncEngine, base: str) -> None:
        self._engine = engine
        self._base = base
        self._scope = DataScopeFilter(engine)

    def table(self, tenant_id: int | None = None) -> str:
        tid = tenant_id or get_tenant_id()
        if tid is None:
            raise ValueError("未选择租户")
        return biz_table(self._base, tid)

    async def scope_where(
        self, *, dept_column: str | None = "dept_id", user_column: str = "created_by"
    ) -> tuple[str, dict[str, object]]:
        dept_ids, user_ids = await self._scope.resolve_visible()
        return self._scope.build_where_clause(
            dept_ids, user_ids, dept_column=dept_column, user_column=user_column
        )
