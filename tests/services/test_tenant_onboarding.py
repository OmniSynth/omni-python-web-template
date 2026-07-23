"""租户开通管理员逻辑测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock

from omni_api.schemas.auth import UserRecord
from omni_api.schemas.tenant import TenantRecord
from omni_api.services.tenant_onboarding import TenantOnboardingService

_NOW = datetime(2026, 1, 1)


def _tenant(phone: str = "13800138000") -> TenantRecord:
    return TenantRecord(
        id=1004,
        code="co-110105-0001",
        name="测试租户",
        province="北京市",
        city="北京市",
        district="朝阳区",
        region="110105",
        phone=phone,
        admin_user_id=None,
        admin_username=None,
        admin_display_name=None,
        enabled=True,
        created_at=_NOW,
        updated_at=_NOW,
    )


def _user(user_id: int = 9, username: str = "13800138000") -> UserRecord:
    return UserRecord(
        id=user_id,
        username=username,
        display_name="已有用户",
        enabled=True,
        roles=[],
        dept_id=None,
        created_at=_NOW,
        updated_at=_NOW,
        created_by=None,
        updated_by=None,
    )


def test_provision_admin_binds_existing_user_by_tenant_phone() -> None:
    async def _run() -> None:
        svc = TenantOnboardingService.__new__(TenantOnboardingService)
        svc._users = AsyncMock()
        svc._admin = AsyncMock()
        tenant = _tenant()
        svc._users.get_by_username.return_value = (_user(), "hash")

        creds = await svc._provision_admin(
            tenant_id=tenant.id,
            tenant=tenant,
            dept_id=1,
            admin_user_id=None,
        )

        assert creds is None
        svc._admin.bind_admin.assert_awaited_once_with(tenant.id, 9, dept_id=1)
        svc._users.create_user.assert_not_called()

    asyncio.run(_run())


def test_provision_admin_creates_user_when_no_match() -> None:
    async def _run() -> None:
        svc = TenantOnboardingService.__new__(TenantOnboardingService)
        svc._users = AsyncMock()
        svc._admin = AsyncMock()
        tenant = _tenant("13900139000")
        svc._users.get_by_username.return_value = None
        svc._users.create_user.return_value = _user(user_id=10, username="13900139000")

        creds = await svc._provision_admin(
            tenant_id=tenant.id,
            tenant=tenant,
            dept_id=1,
            admin_user_id=None,
        )

        assert creds is not None
        assert creds.username == "13900139000"
        assert creds.password
        svc._users.create_user.assert_awaited_once()
        svc._admin.bind_admin.assert_awaited_once_with(tenant.id, 10, dept_id=1)

    asyncio.run(_run())


def test_provision_admin_respects_manual_admin_user_id() -> None:
    async def _run() -> None:
        svc = TenantOnboardingService.__new__(TenantOnboardingService)
        svc._users = AsyncMock()
        svc._admin = AsyncMock()

        creds = await svc._provision_admin(
            tenant_id=1004,
            tenant=_tenant(),
            dept_id=1,
            admin_user_id=42,
        )

        assert creds is None
        svc._users.get_by_username.assert_not_called()
        svc._admin.bind_admin.assert_awaited_once_with(1004, 42, dept_id=1)

    asyncio.run(_run())
