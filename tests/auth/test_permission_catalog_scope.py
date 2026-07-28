"""权限目录域测试。"""

from __future__ import annotations

from omni_api.auth.permission_catalog_scope import (
    invalid_codes_for_role_type,
    root_catalog_for,
)
from omni_api.schemas.sys_role_type import ROLE_TYPE_SYSTEM, ROLE_TYPE_TENANT


def test_root_catalog_for_dev_param() -> None:
    assert root_catalog_for("menu.dev_params") == "catalog.tenant"
    assert root_catalog_for("dev_param.list") == "catalog.tenant"


def test_root_catalog_for_system_menu() -> None:
    assert root_catalog_for("menu.users") == "catalog.system"
    assert root_catalog_for("system.user.list") == "catalog.system"


def test_system_role_rejects_tenant_catalog_permissions() -> None:
    invalid = invalid_codes_for_role_type(
        ROLE_TYPE_SYSTEM,
        ["menu.depts", "menu.dev_params", "menu.users"],
    )
    assert "menu.depts" in invalid
    assert "menu.dev_params" in invalid
    assert "menu.users" not in invalid


def test_tenant_role_rejects_system_catalog_permissions() -> None:
    invalid = invalid_codes_for_role_type(
        ROLE_TYPE_TENANT,
        ["menu.users", "menu.orgs", "menu.depts"],
    )
    assert "menu.users" in invalid
    assert "menu.orgs" in invalid
    assert "menu.depts" not in invalid


def test_tenant_role_accepts_settings_catalog_permissions() -> None:
    invalid = invalid_codes_for_role_type(
        ROLE_TYPE_TENANT,
        ["menu.depts", "menu.dev_params", "menu.profile", "dev_param.list"],
    )
    assert invalid == []


def test_tenant_root_catalogs_match_seed_non_system_roots() -> None:
    from omni_api.auth.permission_catalog_scope import TENANT_CATALOGS

    assert TENANT_CATALOGS == frozenset({"catalog.tenant"})
    assert "catalog.system" not in TENANT_CATALOGS
    assert "catalog.platform" not in TENANT_CATALOGS
