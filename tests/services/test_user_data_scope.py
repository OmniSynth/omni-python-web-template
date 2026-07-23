"""用户数据权限规范化测试。"""

import pytest

from omni_api.schemas.tenant import RoleDataScopeItem
from omni_api.services.user_data_scope import normalize_user_data_scope


def test_normalize_user_data_scope_non_custom() -> None:
    scope, scopes = normalize_user_data_scope(2, [RoleDataScopeItem(scope_type="dept", scope_id=1)])
    assert scope == 2
    assert scopes == []


def test_normalize_user_data_scope_custom_requires_dept() -> None:
    with pytest.raises(ValueError, match="至少选择一个部门"):
        normalize_user_data_scope(4, [])


def test_normalize_user_data_scope_custom_ok() -> None:
    scope, scopes = normalize_user_data_scope(
        4,
        [RoleDataScopeItem(scope_type="dept", scope_id=3)],
    )
    assert scope == 4
    assert scopes == [RoleDataScopeItem(scope_type="dept", scope_id=3)]
