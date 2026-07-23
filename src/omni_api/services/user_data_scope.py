"""用户数据权限校验与规范化。"""

from __future__ import annotations

from omni_api.schemas.tenant import RoleDataScopeItem


def normalize_user_data_scope(
    data_scope: int,
    custom_scopes: list[RoleDataScopeItem] | None,
) -> tuple[int, list[RoleDataScopeItem]]:
    """校验并规范化用户数据权限范围。"""
    scopes = list(custom_scopes or [])
    if data_scope == 4:
        dept_ids = [item.scope_id for item in scopes if item.scope_type == "dept"]
        if not dept_ids:
            raise ValueError("自定义数据权限须至少选择一个部门")
        return data_scope, [RoleDataScopeItem(scope_type="dept", scope_id=did) for did in dept_ids]
    return data_scope, []
