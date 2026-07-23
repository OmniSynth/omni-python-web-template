"""认证服务单元测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

from omni_api.schemas.auth import LoginRequest, UserRecord
from omni_api.services.auth_service import (
    AuthError,
    hash_password,
    verify_password,
)
from omni_api.services.session_service import SessionService

TEST_TENANT_ID = 42
TEST_TENANT_NAME = "示例租户"


def _user(**kwargs: Any) -> UserRecord:
    now = datetime(2026, 1, 1, 12, 0, 0)
    data: dict[str, Any] = {
        "id": 1,
        "username": "admin",
        "display_name": "管理员",
        "enabled": True,
        "roles": [],
        "created_at": now,
        "updated_at": now,
        "created_by": None,
        "updated_by": None,
    }
    data.update(kwargs)
    return UserRecord.model_validate(data)


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_session_login_success() -> None:
    async def _run() -> None:
        hashed = hash_password("pass")
        svc = SessionService()
        with patch.object(svc._users, "get_by_username", new_callable=AsyncMock) as mock_user:
            mock_user.return_value = (_user(), hashed)
            with patch.object(
                svc._tenants, "list_user_bindings", new_callable=AsyncMock
            ) as mock_bind:
                from omni_api.schemas.tenant import UserTenantBinding

                mock_bind.return_value = [
                    UserTenantBinding(user_id=1, tenant_id=TEST_TENANT_ID, dept_id=None)
                ]
                with patch.object(
                    svc._tenants, "list_bound_tenant_infos", new_callable=AsyncMock
                ) as mock_infos:
                    from omni_api.schemas.tenant import BoundTenantInfo

                    mock_infos.return_value = [BoundTenantInfo(id=TEST_TENANT_ID, name=TEST_TENANT_NAME)]
                    with patch(
                        "omni_api.services.session_service.resolve_user_permissions",
                        new_callable=AsyncMock,
                    ) as mock_resolve_perms:
                        mock_resolve_perms.return_value = (["admin"], {"menu.depts"})
                        with patch.object(svc._store, "create", return_value="a" * 32):
                            with patch.object(
                                svc._tenants, "update_last_login", new_callable=AsyncMock
                            ):
                                with patch.object(
                                    svc._users, "get_avatar_url", new_callable=AsyncMock
                                ) as mock_avatar:
                                    mock_avatar.return_value = None
                                    res = await svc.login(
                                        LoginRequest(username="admin", password="pass")
                                    )
        assert res.session_token
        assert res.user.username == "admin"

    asyncio.run(_run())


def test_session_refresh_without_tenant_returns_current_user() -> None:
    async def _run() -> None:
        svc = SessionService()
        session = {
            "user_id": 2,
            "username": "13777676835",
            "display_name": "小赌狗",
            "tenant_id": None,
            "dept_id": None,
            "roles": [],
            "permissions": [],
            "bound_tenants": [{"id": TEST_TENANT_ID, "name": TEST_TENANT_NAME}],
            "need_tenant_select": True,
        }
        with patch.object(svc._store, "get", return_value=session):
            with patch.object(svc, "resolve", new_callable=AsyncMock) as mock_resolve:
                mock_resolve.return_value = session
                user = await svc.refresh("a" * 32)
        assert user.need_tenant_select
        assert user.tenant_id is None
        assert user.username == "13777676835"

    asyncio.run(_run())


def test_session_login_without_roles_forces_tenant_select() -> None:
    async def _run() -> None:
        hashed = hash_password("pass")
        svc = SessionService()
        with patch.object(svc._users, "get_by_username", new_callable=AsyncMock) as mock_user:
            mock_user.return_value = (_user(id=2), hashed)
            with patch.object(
                svc._tenants, "list_user_bindings", new_callable=AsyncMock
            ) as mock_bind:
                from omni_api.schemas.tenant import UserTenantBinding

                mock_bind.return_value = [
                    UserTenantBinding(user_id=2, tenant_id=TEST_TENANT_ID, dept_id=None)
                ]
                with patch.object(
                    svc._tenants, "list_bound_tenant_infos", new_callable=AsyncMock
                ) as mock_infos:
                    from omni_api.schemas.tenant import BoundTenantInfo

                    mock_infos.return_value = [BoundTenantInfo(id=TEST_TENANT_ID, name=TEST_TENANT_NAME)]
                    with patch(
                        "omni_api.services.session_service.resolve_user_permissions",
                        new_callable=AsyncMock,
                    ) as mock_resolve_perms:
                        mock_resolve_perms.return_value = ([], set())
                        with patch.object(svc._store, "create", return_value="a" * 32):
                            with patch.object(
                                svc._users, "get_avatar_url", new_callable=AsyncMock
                            ) as mock_avatar:
                                mock_avatar.return_value = None
                                res = await svc.login(
                                    LoginRequest(username="admin", password="pass")
                                )
        assert res.need_tenant_select
        assert res.user.tenant_id is None

    asyncio.run(_run())


def test_session_switch_tenant_without_roles_raises() -> None:
    async def _run() -> None:
        svc = SessionService()
        session = {
            "user_id": 2,
            "username": "u",
            "display_name": "U",
            "tenant_id": None,
            "bound_tenants": [{"id": TEST_TENANT_ID, "name": TEST_TENANT_NAME}],
            "need_tenant_select": True,
        }
        with patch.object(svc, "resolve", new_callable=AsyncMock) as mock_resolve:
            mock_resolve.return_value = session
            with patch.object(
                svc._tenants, "is_user_active_in_tenant", new_callable=AsyncMock
            ) as mock_active:
                mock_active.return_value = True
                with patch.object(
                    svc._tenants, "get_user_dept_id", new_callable=AsyncMock
                ) as mock_dept:
                    mock_dept.return_value = None
                    with patch.object(
                        svc._tenants, "list_bound_tenant_infos", new_callable=AsyncMock
                    ) as mock_infos:
                        from omni_api.schemas.tenant import BoundTenantInfo

                        mock_infos.return_value = [
                            BoundTenantInfo(id=TEST_TENANT_ID, name=TEST_TENANT_NAME)
                        ]
                        with patch(
                            "omni_api.services.session_service.RoleRepo"
                        ) as mock_role_cls:
                            mock_role_cls.return_value.sync_tenant_system_role_permissions = (
                                AsyncMock(return_value=[])
                            )
                            with patch(
                                "omni_api.services.session_service.resolve_user_permissions",
                                new_callable=AsyncMock,
                            ) as mock_resolve_perms:
                                mock_resolve_perms.return_value = ([], set())
                                with pytest.raises(AuthError, match="未开通访问权限"):
                                    await svc.switch_tenant("a" * 32, TEST_TENANT_ID)

    asyncio.run(_run())


def test_session_login_bad_password() -> None:
    async def _run() -> None:
        svc = SessionService()
        with patch.object(svc._users, "get_by_username", new_callable=AsyncMock) as mock_user:
            mock_user.return_value = (_user(), hash_password("pass"))
            with pytest.raises(AuthError):
                await svc.login(LoginRequest(username="admin", password="wrong"))

    asyncio.run(_run())
