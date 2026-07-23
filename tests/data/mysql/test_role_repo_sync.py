"""admin 权限同步测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from omni_api.auth.permission_seed import ROLE_ADMIN
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.schemas.rbac import RoleRecord


def _admin_role(perms: list[str]) -> RoleRecord:
    now = datetime(2026, 1, 1)
    return RoleRecord(
        id=1,
        code=ROLE_ADMIN,
        name="管理员",
        description="",
        permissions=perms,
        created_at=now,
        updated_at=now,
    )


def test_sync_admin_permissions_adds_missing() -> None:
    async def _run() -> None:
        perm_repo = MagicMock()
        perm_repo.list_enabled_codes = AsyncMock(
            return_value=["menu.depts", "menu.audit", "system.permission.list"]
        )
        perm_repo.expand_codes = AsyncMock(side_effect=lambda codes: sorted(set(codes)))
        perm_repo.validate_codes = AsyncMock()

        repo = RoleRepo(MagicMock(), permission_repo=perm_repo)
        repo.get_by_code = AsyncMock(return_value=_admin_role(["menu.depts"]))
        set_role_permissions = AsyncMock(return_value=_admin_role([]))
        repo.set_role_permissions = set_role_permissions

        added = await repo.sync_admin_permissions()

        assert "menu.audit" in added
        set_role_permissions.assert_awaited_once()
        assert set_role_permissions.await_args is not None
        call_perms = set_role_permissions.await_args.args[1]
        assert "menu.audit" in call_perms

    asyncio.run(_run())


def test_sync_admin_permissions_noop_when_complete() -> None:
    async def _run() -> None:
        full = ["menu.depts", "menu.audit"]
        perm_repo = MagicMock()
        perm_repo.list_enabled_codes = AsyncMock(return_value=full)
        perm_repo.expand_codes = AsyncMock(side_effect=lambda codes: sorted(set(codes)))
        perm_repo.validate_codes = AsyncMock()

        repo = RoleRepo(MagicMock(), permission_repo=perm_repo)
        repo.get_by_code = AsyncMock(return_value=_admin_role(full))
        repo.set_role_permissions = AsyncMock()

        added = await repo.sync_admin_permissions()

        assert added == []
        repo.set_role_permissions.assert_not_awaited()

    asyncio.run(_run())
