"""租户用户离职服务测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from omni_api.schemas.auth import UserRecord
from omni_api.schemas.tenant import MEMBERSHIP_ACTIVE, MEMBERSHIP_DEPARTED
from omni_api.services.tenant_user_offboard import TenantUserOffboardService


def _user(user_id: int, *, status: int = MEMBERSHIP_ACTIVE) -> UserRecord:
    now = datetime(2026, 1, 1)
    return UserRecord(
        id=user_id,
        username=f"u{user_id}",
        display_name=f"用户{user_id}",
        enabled=True,
        membership_status=status,
        created_at=now,
        updated_at=now,
    )


def test_offboard_rejects_self() -> None:
    async def _run() -> None:
        service = TenantUserOffboardService(MagicMock())
        with pytest.raises(ValueError, match="不能离职自己"):
            await service.offboard(1, 1, actor_id=1)

    asyncio.run(_run())


def test_offboard_rejects_tenant_admin() -> None:
    async def _run() -> None:
        service = TenantUserOffboardService(MagicMock())
        service._tenants.get_admin_user_id = AsyncMock(return_value=9)
        service._users.get_by_id = AsyncMock(return_value=_user(9))
        with pytest.raises(ValueError, match="不能离职租户管理员"):
            await service.offboard(2, 9, actor_id=1)

    asyncio.run(_run())


def test_offboard_success() -> None:
    async def _run() -> None:
        service = TenantUserOffboardService(MagicMock())
        before = _user(9)
        after = _user(9, status=MEMBERSHIP_DEPARTED)
        service._tenants.get_admin_user_id = AsyncMock(return_value=1)
        service._users.get_by_id = AsyncMock(side_effect=[before, after])
        service._tenants.depart_user = AsyncMock()
        service._sessions.invalidate_tenant_access = AsyncMock()
        got_before, got_after = await service.offboard(2, 9, actor_id=1)
        assert got_before.id == 9
        assert got_after.membership_status == MEMBERSHIP_DEPARTED
        service._tenants.depart_user.assert_awaited_once_with(9, 2)
        service._sessions.invalidate_tenant_access.assert_awaited_once_with(9, 2)

    asyncio.run(_run())
