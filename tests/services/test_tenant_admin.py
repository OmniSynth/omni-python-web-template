"""租户管理员绑定测试。"""

from __future__ import annotations

from omni_api.services.tenant_admin import TenantAdminService


def test_tenant_admin_service_module_importable() -> None:
    assert TenantAdminService is not None
