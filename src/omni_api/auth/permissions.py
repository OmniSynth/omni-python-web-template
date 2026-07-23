"""RBAC 常量（权限数据已迁移至 MySQL）。"""

from omni_api.auth.permission_seed import (
    ASSIGNABLE_KINDS,
    DEFAULT_ROLE_DEFS,
    ROLE_ADMIN,
    ROLE_OPERATOR,
    ROLE_VIEWER,
)

__all__ = [
    "ASSIGNABLE_KINDS",
    "DEFAULT_ROLE_DEFS",
    "ROLE_ADMIN",
    "ROLE_OPERATOR",
    "ROLE_VIEWER",
]
