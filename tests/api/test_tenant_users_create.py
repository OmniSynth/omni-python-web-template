"""租户域用户创建：新建 / 绑定已有用户。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from omni_api.api import tenant_users as api
from omni_api.schemas.auth import TenantUserCreate, UserRecord
from omni_api.schemas.rbac import RoleSummary


def _user(user_id: int = 9, *, enabled: bool = True) -> UserRecord:
    now = datetime(2026, 1, 1)
    return UserRecord(
        id=user_id,
        username="13800138001",
        display_name="已有用户",
        enabled=enabled,
        roles=[RoleSummary(id=2, code="operator", name="操作员")],
        created_at=now,
        updated_at=now,
    )


def _create_body() -> TenantUserCreate:
    return TenantUserCreate(
        username="13800138001",
        display_name="表单显示名",
        role_ids=[2],
        dept_id=3,
        data_scope=1,
    )


def test_create_tenant_user_binds_existing_user() -> None:
    async def _run() -> None:
        actor = _user(1)
        existing = _user(9)
        bound = existing.model_copy(update={"dept_id": 3})
        fake_repo = MagicMock()
        fake_repo.get_by_username = AsyncMock(return_value=(existing, "hash"))
        fake_repo.is_user_active_in_tenant = AsyncMock(return_value=False)
        fake_repo.bind_user_to_tenant = AsyncMock(return_value=bound)
        fake_repo.create_user = AsyncMock()
        with (
            patch.object(api, "current_tenant_id", return_value=2),
            patch.object(api, "_repo", return_value=fake_repo),
            patch.object(api, "AuditService") as audit_cls,
        ):
            audit_cls.return_value.record_operation = AsyncMock()
            result = await api.create_tenant_user(_create_body(), actor=actor)
        assert result.bound_existing is True
        assert result.password is None
        assert result.user.id == 9
        fake_repo.bind_user_to_tenant.assert_awaited_once_with(
            9,
            2,
            dept_id=3,
            role_ids=[2],
            data_scope=1,
            custom_scopes=[],
        )
        fake_repo.create_user.assert_not_awaited()

    asyncio.run(_run())


def test_create_tenant_user_rejects_already_bound_username() -> None:
    async def _run() -> None:
        actor = _user(1)
        existing = _user(9)
        fake_repo = MagicMock()
        fake_repo.get_by_username = AsyncMock(return_value=(existing, "hash"))
        fake_repo.is_user_active_in_tenant = AsyncMock(return_value=True)
        with (
            patch.object(api, "current_tenant_id", return_value=2),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            with pytest.raises(HTTPException) as exc:
                await api.create_tenant_user(_create_body(), actor=actor)
        assert exc.value.status_code == 400
        assert exc.value.detail == "用户名已存在"

    asyncio.run(_run())


def test_create_tenant_user_creates_new_user() -> None:
    async def _run() -> None:
        actor = _user(1)
        created = _user(10, enabled=True)
        fake_repo = MagicMock()
        fake_repo.get_by_username = AsyncMock(return_value=None)
        fake_repo.create_user = AsyncMock(return_value=created)
        with (
            patch.object(api, "current_tenant_id", return_value=2),
            patch.object(api, "_repo", return_value=fake_repo),
            patch.object(api, "generate_random_password", return_value="Secret12"),
            patch.object(api, "hash_password", return_value="hashed"),
            patch.object(api, "AuditService") as audit_cls,
        ):
            audit_cls.return_value.record_operation = AsyncMock()
            result = await api.create_tenant_user(_create_body(), actor=actor)
        assert result.bound_existing is False
        assert result.password == "Secret12"
        assert result.user.id == 10
        fake_repo.create_user.assert_awaited_once()

    asyncio.run(_run())
