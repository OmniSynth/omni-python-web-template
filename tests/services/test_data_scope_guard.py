"""数据权限守卫测试。"""

from __future__ import annotations

from unittest.mock import MagicMock

from omni_api.services.data_scope_guard import DataScopeGuard


def test_can_access_by_subject_user() -> None:
    assert DataScopeGuard.can_access(None, None, set(), {7}, subject_user_id=7)


def test_can_access_by_dept() -> None:
    assert DataScopeGuard.can_access(3, None, {3}, set())


def test_can_access_by_creator() -> None:
    assert DataScopeGuard.can_access(None, 9, set(), {9})


def test_can_access_denied() -> None:
    assert not DataScopeGuard.can_access(1, 2, {3}, {4}, subject_user_id=5)


def test_build_where_clause_skips_dept_when_column_absent() -> None:
    from omni_api.services.data_scope_service import DataScopeFilter

    filt = DataScopeFilter(MagicMock())
    clause, params = filt.build_where_clause(
        {1, 2},
        {3},
        dept_column=None,
        user_column="created_by",
    )
    assert "dept_id" not in clause
    assert "created_by IN :user_ids" in clause
    assert params == {"user_ids": (3,)}


def test_requires_data_scope_policy() -> None:
    from omni_api.services.data_scope_policy import (
        is_platform_api,
        is_profile_api,
        is_tenant_scoped_api,
        requires_data_scope,
    )

    assert is_profile_api("/api/v1/users/me/profile")
    assert is_platform_api("/api/v1/permissions/tree")
    assert not requires_data_scope("/api/v1/permissions")
    assert not requires_data_scope("/api/v1/users")
    assert not requires_data_scope("/api/v1/roles")
    assert not requires_data_scope("/api/v1/audit/requests")
    assert not requires_data_scope("/api/v1/orgs")
    assert not requires_data_scope("/api/v1/tenants")
    assert is_tenant_scoped_api("/api/v1/tenant/users")
    assert requires_data_scope("/api/v1/tenant/users")
    assert requires_data_scope("/api/v1/tenant/roles")
    assert requires_data_scope("/api/v1/depts")
    assert not requires_data_scope("/api/v1/users/me/profile")
