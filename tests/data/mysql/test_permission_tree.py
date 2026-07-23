"""权限树构建测试。"""

from __future__ import annotations

from datetime import UTC, datetime

from omni_api.data.mysql.permission_tree import build_permission_tree_nodes
from omni_api.schemas.rbac import PermissionRecord

_NOW = datetime.now(UTC)


def _perm(
    id: int,
    code: str,
    kind: str,
    *,
    parent_id: int | None = None,
    sort_order: int = 0,
) -> PermissionRecord:
    return PermissionRecord(
        id=id,
        code=code,
        name=code,
        kind=kind,
        parent_id=parent_id,
        sort_order=sort_order,
        enabled=True,
        route_path=None,
        component_key=None,
        api_method=None,
        api_path_pattern=None,
        description="",
        is_system=True,
        created_at=_NOW,
        updated_at=_NOW,
    )


def test_tree_attaches_api_under_button() -> None:
    perms = [
        _perm(1, "catalog.tenant", "catalog"),
        _perm(2, "menu.tenant_users", "menu", parent_id=1),
        _perm(3, "tenant.user.create", "button", parent_id=2),
        _perm(4, "tenant.user.list", "api"),
        _perm(5, "tenant.user.create", "api"),
    ]
    bindings = {
        "menu.tenant_users": ["tenant.user.list"],
        "tenant.user.create": ["tenant.user.create"],
    }

    tree = build_permission_tree_nodes(
        perms, bindings, assignable_only=False, enabled_only=True
    )

    assert len(tree) == 1
    menu = tree[0]["children"][0]
    assert menu["code"] == "menu.tenant_users"
    menu_api_codes = [c["code"] for c in menu["children"] if c["kind"] == "api"]
    assert menu_api_codes == ["tenant.user.list"]

    button = next(c for c in menu["children"] if c["kind"] == "button")
    assert button["code"] == "tenant.user.create"
    assert [c["code"] for c in button["children"]] == ["tenant.user.create"]


def test_nav_tree_excludes_api() -> None:
    perms = [
        _perm(1, "catalog.tenant", "catalog"),
        _perm(2, "menu.depts", "menu", parent_id=1),
        _perm(3, "tenant.dept.list", "api"),
    ]
    bindings = {"menu.depts": ["tenant.dept.list"]}

    tree = build_permission_tree_nodes(
        perms, bindings, assignable_only=False, nav_only=True
    )

    menu = tree[0]["children"][0]
    assert all(c["kind"] != "api" for c in menu["children"])
    assert menu["children"] == []
