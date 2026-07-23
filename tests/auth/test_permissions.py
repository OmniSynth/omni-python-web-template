"""权限种子与路径匹配测试。"""

from __future__ import annotations

from omni_api.auth.permission_seed import (
    API_ROUTE_SEEDS,
    ASSIGNABLE_KINDS,
    DEFAULT_ROLE_DEFS,
    PERMISSION_SEEDS,
    ROLE_ADMIN,
)
from omni_api.data.mysql.permission_path import match_path_pattern


def test_seed_codes_unique() -> None:
    codes = [s.code for s in PERMISSION_SEEDS]
    assert len(codes) == len(set(codes))


def test_default_roles_reference_valid_codes() -> None:
    codes = {s.code for s in PERMISSION_SEEDS}
    for role_code, (_, _, assignable) in DEFAULT_ROLE_DEFS.items():
        assert role_code in (ROLE_ADMIN, "operator", "viewer")
        if role_code != ROLE_ADMIN:
            for perm in assignable:
                assert perm in codes, perm


def test_assignable_kinds_exclude_api() -> None:
    api_codes = {s.code for s in PERMISSION_SEEDS if s.kind == "api"}
    assignable = {s.code for s in PERMISSION_SEEDS if s.kind in ASSIGNABLE_KINDS}
    assert not assignable & api_codes


def test_api_route_seeds_reference_known_codes() -> None:
    codes = {s.code for s in PERMISSION_SEEDS}
    for code, _method, _pattern in API_ROUTE_SEEDS:
        assert code in codes


def test_match_path_pattern_exact() -> None:
    assert match_path_pattern("/api/v1/users", "/api/v1/users")
    assert not match_path_pattern("/api/v1/users", "/api/v1/users/1")


def test_match_path_pattern_wildcard() -> None:
    assert match_path_pattern("/api/v1/users/*", "/api/v1/users/42")
    assert match_path_pattern(
        "/api/v1/tenant/users/*/offboard",
        "/api/v1/tenant/users/abc/offboard",
    )
    assert not match_path_pattern(
        "/api/v1/tenant/users/*/offboard",
        "/api/v1/tenant/users/abc/enabled",
    )
    assert match_path_pattern(
        "/api/v1/scheduled-jobs/*/trigger",
        "/api/v1/scheduled-jobs/7/trigger",
    )


def test_menu_permissions_have_route_and_component() -> None:
    menus = [s for s in PERMISSION_SEEDS if s.kind == "menu"]
    assert len(menus) >= 6
    for menu in menus:
        assert menu.route_path is not None
        assert menu.component_key is not None
