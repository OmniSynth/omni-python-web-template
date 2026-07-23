"""数据权限路由策略：平台与租户 API 分域，互不影响。"""

from __future__ import annotations

import re

# 平台域 API：仅功能权限，仓储层不做数据范围裁剪
PLATFORM_API_PREFIXES: tuple[str, ...] = (
    "/api/v1/permissions",
    "/api/v1/auth/",
    "/api/v1/health",
    "/api/v1/users",
    "/api/v1/roles",
    "/api/v1/audit",
    "/api/v1/orgs",
    "/api/v1/tenants",
)

# 租户域 API：仓储层固定应用合并数据权限
TENANT_SCOPED_API_PREFIXES: tuple[str, ...] = (
    "/api/v1/tenant/users",
    "/api/v1/tenant/roles",
    "/api/v1/tenant/depts",
)

# 业务 API：同样应用数据权限
BUSINESS_SCOPED_API_PREFIXES: tuple[str, ...] = (
    "/api/v1/depts",
)

# 个人中心：固定仅本人，不走合并范围
_PROFILE_API_PREFIX = "/api/v1/users/me/"

# 需遵守合并数据权限的 Web 路由（文档对照用）
DATA_SCOPE_WEB_ROUTES: frozenset[str] = frozenset(
    {
        "/users",
        "/roles",
        "/depts",
        "/profile",
    }
)

_PERMISSIONS_TREE_SUFFIX = re.compile(
    r"^/api/v1/(?:tenant/)?roles/permissions/tree$"
)


def is_profile_api(path: str) -> bool:
    return path.startswith(_PROFILE_API_PREFIX)


def is_platform_api(path: str) -> bool:
    """平台管理 API，与租户域隔离。"""
    if is_profile_api(path):
        return True
    if _PERMISSIONS_TREE_SUFFIX.match(path.rstrip("/")):
        return True
    return any(path.startswith(p) for p in PLATFORM_API_PREFIXES)


def is_tenant_scoped_api(path: str) -> bool:
    """租户管理 API，须应用数据权限。"""
    return any(path.startswith(p) for p in TENANT_SCOPED_API_PREFIXES)


def requires_data_scope(api_path: str) -> bool:
    """业务与租户 API 须应用合并数据权限；平台 API 与个人中心除外。"""
    if is_platform_api(api_path):
        return False
    if any(api_path.startswith(p) for p in TENANT_SCOPED_API_PREFIXES):
        return True
    return any(api_path.startswith(p) for p in BUSINESS_SCOPED_API_PREFIXES)
