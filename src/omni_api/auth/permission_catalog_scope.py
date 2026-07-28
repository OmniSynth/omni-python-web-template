"""权限目录域：系统目录 vs 租户目录。"""

from __future__ import annotations

from omni_api.auth.permission_seed import PERMISSION_SEEDS
from omni_api.schemas.sys_role_type import ROLE_TYPE_SYSTEM, RoleType

# 系统角色可绑定的根目录（平台侧）
SYSTEM_CATALOGS = frozenset({"catalog.system", "catalog.platform"})


def _discover_tenant_catalogs() -> frozenset[str]:
    """种子中无父节点、且非系统域的 catalog.* 根目录，均为租户可绑定域。"""
    return frozenset(
        seed.code
        for seed in PERMISSION_SEEDS
        if seed.kind == "catalog" and seed.parent is None and seed.code not in SYSTEM_CATALOGS
    )


# 租户角色可绑定的根目录（随 permission_seed 业务目录自动扩展）
TENANT_CATALOGS = _discover_tenant_catalogs()


def _build_root_catalog_map() -> dict[str, str]:
    parent_by_code = {seed.code: seed.parent for seed in PERMISSION_SEEDS}
    api_anchor: dict[str, str] = {}
    for seed in PERMISSION_SEEDS:
        for api_code in seed.api_codes:
            api_anchor.setdefault(api_code, seed.code)

    cache: dict[str, str] = {}

    def resolve(code: str) -> str | None:
        if code in cache:
            return cache[code]
        if code.startswith("catalog."):
            cache[code] = code
            return code
        parent = parent_by_code.get(code)
        if parent is not None:
            root = resolve(parent)
            if root is not None:
                cache[code] = root
                return root
        anchor = api_anchor.get(code)
        if anchor is not None:
            root = resolve(anchor)
            if root is not None:
                cache[code] = root
                return root
        fallback = _fallback_root_catalog(code)
        if fallback is not None:
            cache[code] = fallback
        return fallback

    for seed in PERMISSION_SEEDS:
        resolve(seed.code)
    return cache


def _fallback_root_catalog(code: str) -> str | None:
    if code.startswith(("system.org.", "system.tenant.")):
        return "catalog.platform"
    if code.startswith("system."):
        return "catalog.system"
    if code.startswith(("tenant.", "user.profile.", "auth.", "dev_param.")):
        return "catalog.tenant"
    return None


ROOT_CATALOG_BY_CODE = _build_root_catalog_map()


def root_catalog_for(code: str) -> str | None:
    return ROOT_CATALOG_BY_CODE.get(code)


def allowed_catalogs_for_role_type(role_type: RoleType) -> frozenset[str]:
    if role_type == ROLE_TYPE_SYSTEM:
        return SYSTEM_CATALOGS
    return TENANT_CATALOGS


def invalid_codes_for_role_type(role_type: RoleType, codes: list[str]) -> list[str]:
    allowed = allowed_catalogs_for_role_type(role_type)
    invalid: list[str] = []
    for code in codes:
        root = root_catalog_for(code)
        if root is None:
            continue
        if root not in allowed:
            invalid.append(code)
    return invalid


def assignment_excluded_catalogs_for_role_type(role_type: RoleType) -> frozenset[str]:
    if role_type == ROLE_TYPE_SYSTEM:
        return TENANT_CATALOGS
    return SYSTEM_CATALOGS
