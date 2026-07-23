"""审计路径分级。"""

from __future__ import annotations

from typing import Literal

AuditLevel = Literal["system", "business"]

_SYSTEM_PREFIXES = (
    "/api/v1/auth",
    "/api/v1/users",
    "/api/v1/roles",
    "/api/v1/audit",
)


def classify_request_level(path: str) -> AuditLevel:
    """按 API 路径划分系统级 / 业务级请求日志。"""
    for prefix in _SYSTEM_PREFIXES:
        if path.startswith(prefix):
            return "system"
    if path.startswith("/api/"):
        return "business"
    return "system"
