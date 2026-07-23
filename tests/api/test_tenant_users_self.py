"""租户域用户编辑限制测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from omni_api.api import tenant_users as api
from omni_api.schemas.auth import TenantUserUpdate, UserRecord
from omni_api.schemas.rbac import RoleSummary


def _user(user_id: int = 1) -> UserRecord:
    now = datetime(2026, 1, 1)
    return UserRecord(
        id=user_id,
        username="13800138000",
        display_name="管理员",
        enabled=True,
        roles=[RoleSummary(id=10, code="admin", name="管理员")],
        created_at=now,
        updated_at=now,
    )


def test_update_tenant_user_rejects_self() -> None:
    async def _run() -> None:
        actor = _user(1)
        member = _user(1)
        fake_repo = MagicMock()
        fake_repo.is_user_in_tenant = AsyncMock(return_value=True)
        fake_repo.get_by_id = AsyncMock(return_value=member)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
            patch.object(api.DataScopeGuard, "assert_access", AsyncMock()),
        ):
            with pytest.raises(HTTPException) as exc:
                await api.update_tenant_user(
                    1,
                    TenantUserUpdate(role_ids=[10], enabled=True, dept_id=3),
                    actor=actor,
                )
        assert exc.value.status_code == 403

    asyncio.run(_run())


def test_update_tenant_user_delegates_to_repo() -> None:
    async def _run() -> None:
        actor = _user(2)
        member = _user(1)
        updated = member.model_copy(update={"enabled": False})
        fake_repo = MagicMock()
        fake_repo.is_user_in_tenant = AsyncMock(return_value=True)
        fake_repo.get_by_id = AsyncMock(side_effect=[member, member])
        fake_repo.update_tenant_member = AsyncMock(return_value=updated)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
            patch.object(api, "AuditService") as audit_cls,
            patch.object(api.DataScopeGuard, "assert_access", AsyncMock()),
        ):
            audit_cls.return_value.record_operation = AsyncMock()
            result = await api.update_tenant_user(
                1,
                TenantUserUpdate(enabled=False, role_ids=[10], dept_id=3),
                actor=actor,
            )
        assert result.enabled is False
        fake_repo.update_tenant_member.assert_awaited_once()

    asyncio.run(_run())
