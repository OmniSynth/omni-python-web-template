"""角色功能权限分配树裁剪规则。"""

from __future__ import annotations

from omni_api.auth.permission_catalog_scope import assignment_excluded_catalogs_for_role_type
from omni_api.schemas.rbac import PermissionInfo
from omni_api.schemas.sys_role_type import ROLE_TYPE_SYSTEM, ROLE_TYPE_TENANT
from omni_api.services.permission_service import PermissionService


def _node(code: str, kind: str, children: list[PermissionInfo] | None = None) -> PermissionInfo:
    return PermissionInfo(code=code, name=code, kind=kind, children=children or [])


def _catalog_codes(nodes: list[PermissionInfo]) -> list[str]:
    return [node.code for node in nodes if node.kind == "catalog"]


def _menu_codes(nodes: list[PermissionInfo]) -> list[str]:
    result: list[str] = []
    for node in nodes:
        if node.kind == "menu":
            result.append(node.code)
        result.extend(_menu_codes(node.children))
    return result


def test_tenant_assignment_tree_includes_tenant_catalog() -> None:
    tree = [
        _node("catalog.tenant", "catalog", [_node("menu.tenant_users", "menu")]),
        _node("catalog.system", "catalog", [_node("menu.users", "menu")]),
        _node("catalog.platform", "catalog", [_node("menu.orgs", "menu")]),
    ]
    filtered = PermissionService._filter_assignment_tree(
        tree,
        excluded_catalogs=assignment_excluded_catalogs_for_role_type(ROLE_TYPE_TENANT),
        excluded_code_prefix="system.",
    )
    assert _catalog_codes(filtered) == ["catalog.tenant"]
    assert "menu.tenant_users" in _menu_codes(filtered)
    assert "menu.users" not in _menu_codes(filtered)


def test_system_assignment_tree_only_system_and_platform() -> None:
    tree = [
        _node("catalog.system", "catalog", [_node("menu.users", "menu")]),
        _node("catalog.platform", "catalog", [_node("menu.orgs", "menu")]),
        _node("catalog.tenant", "catalog", [_node("menu.tenant_users", "menu")]),
    ]
    filtered = PermissionService._filter_assignment_tree(
        tree,
        excluded_catalogs=assignment_excluded_catalogs_for_role_type(ROLE_TYPE_SYSTEM),
        excluded_code_prefix="tenant.",
    )
    assert _catalog_codes(filtered) == [
        "catalog.system",
        "catalog.platform",
    ]
    assert "menu.tenant_users" not in _menu_codes(filtered)
    assert "menu.depts" not in _menu_codes(filtered)


def test_assignment_tree_drops_cross_domain_permission_codes() -> None:
    tree = [
        _node(
            "catalog.tenant",
            "catalog",
            [
                _node("menu.tenant_users", "menu", [_node("tenant.user.list", "button")]),
                _node("system.user.list", "button"),
            ],
        ),
    ]
    tenant_filtered = PermissionService._filter_assignment_tree(
        tree,
        excluded_catalogs=assignment_excluded_catalogs_for_role_type(ROLE_TYPE_TENANT),
        excluded_code_prefix="system.",
    )
    assert _menu_codes(tenant_filtered) == ["menu.tenant_users"]
    tenant_buttons = [
        child.code
        for child in tenant_filtered[0].children[0].children
    ]
    assert tenant_buttons == ["tenant.user.list"]
