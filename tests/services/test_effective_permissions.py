"""有效权限合并测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from omni_api.services.effective_permissions import resolve_user_permissions


def test_resolve_user_permissions_merges_sys_and_tenant() -> None:
    async def _run() -> None:
        engine = MagicMock()
        with patch(
            "omni_api.services.effective_permissions.SysRoleRepo"
        ) as sys_cls, patch(
            "omni_api.services.effective_permissions.RoleRepo"
        ) as tenant_cls, patch(
            "omni_api.services.effective_permissions.PermissionRepo"
        ) as perm_cls:
            sys_cls.return_value.get_user_role_codes = AsyncMock(return_value=["admin"])
            sys_cls.return_value.get_user_permissions = AsyncMock(
                return_value={"system.user.list", "menu.users"}
            )
            tenant_cls.return_value.get_user_role_codes = AsyncMock(return_value=["admin"])
            tenant_cls.return_value.get_user_permissions = AsyncMock(
                return_value={"tenant.user.list"}
            )
            perm_cls.return_value.expand_nav_codes = AsyncMock(
                side_effect=lambda codes: set(codes) | {"menu.tenant_users"}
            )

            roles, perms = await resolve_user_permissions(engine, 1, 1004)

        assert roles == ["admin"]
        assert "system.user.list" in perms
        assert "tenant.user.list" in perms
        assert "menu.tenant_users" in perms

    asyncio.run(_run())
