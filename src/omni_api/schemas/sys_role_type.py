"""平台系统角色类型。"""

from __future__ import annotations

from typing import Literal

RoleType = Literal["system", "tenant"]

ROLE_TYPE_SYSTEM = "system"
ROLE_TYPE_TENANT = "tenant"

ROLE_TYPE_LABELS: dict[str, str] = {
    ROLE_TYPE_SYSTEM: "系统",
    ROLE_TYPE_TENANT: "租户",
}
