"""租户域角色锁定 API 测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from omni_api.api import tenant_roles as api
from omni_api.auth.permission_seed import ROLE_ADMIN, ROLE_OPERATOR
from omni_api.schemas.rbac import RoleCreate, RolePermissionsPatch, RoleRecord, RoleUpdate


def _role(role_id: int, code: str, *, system_managed: bool = False) -> RoleRecord:
    now = datetime(2026, 1, 1)
    return RoleRecord(
        id=role_id,
        code=code,
        name=code,
        description="",
        permissions=["menu.depts"],
        system_managed=system_managed,
        created_at=now,
        updated_at=now,
    )


def test_reject_if_system_managed_edit() -> None:
    with pytest.raises(HTTPException) as exc:
        api._reject_if_system_managed(_role(1, ROLE_ADMIN, system_managed=True))
    assert exc.value.status_code == 400
    assert exc.value.detail == "系统预置角色不可编辑"


def test_reject_if_system_managed_permissions() -> None:
    with pytest.raises(HTTPException) as exc:
        api._reject_if_system_managed(
            _role(2, ROLE_OPERATOR, system_managed=True),
            for_permissions=True,
        )
    assert exc.value.status_code == 400
    assert exc.value.detail == "系统预置角色权限不可修改"


def test_reject_if_system_managed_allows_custom_role() -> None:
    api._reject_if_system_managed(_role(4, "analyst", system_managed=False), for_permissions=True)


def test_update_tenant_role_rejects_system_managed_admin() -> None:
    async def _run() -> None:
        admin = _role(1, ROLE_ADMIN, system_managed=True)
        fake_repo = MagicMock()
        fake_repo.get_by_id = AsyncMock(return_value=admin)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            with pytest.raises(HTTPException) as exc:
                await api.update_tenant_role(1, RoleUpdate(name="新名称"))
        assert exc.value.status_code == 400
        fake_repo.update_role.assert_not_called()

    asyncio.run(_run())


def test_set_tenant_role_permissions_rejects_system_managed_operator() -> None:
    async def _run() -> None:
        operator = _role(2, ROLE_OPERATOR, system_managed=True)
        fake_repo = MagicMock()
        fake_repo.get_by_id = AsyncMock(return_value=operator)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            with pytest.raises(HTTPException) as exc:
                await api.set_tenant_role_permissions(
                    2, RolePermissionsPatch(permissions=["menu.depts"])
                )
        assert exc.value.status_code == 400
        assert exc.value.detail == "系统预置角色权限不可修改"
        fake_repo.set_role_permissions.assert_not_called()

    asyncio.run(_run())


def test_set_tenant_role_permissions_allows_custom_role() -> None:
    async def _run() -> None:
        custom = _role(4, "analyst", system_managed=False)
        updated = custom.model_copy(update={"permissions": ["menu.depts", "menu.dev_params"]})
        fake_repo = MagicMock()
        fake_repo.get_by_id = AsyncMock(return_value=custom)
        fake_repo.set_role_permissions = AsyncMock(return_value=updated)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
            patch.object(api.AuditService, "record_operation", AsyncMock()),
        ):
            result = await api.set_tenant_role_permissions(
                4, RolePermissionsPatch(permissions=["menu.depts"])
            )
        assert result.id == 4
        fake_repo.set_role_permissions.assert_awaited_once()

    asyncio.run(_run())


def test_update_tenant_role_allows_custom_role() -> None:
    async def _run() -> None:
        custom = _role(3, "analyst", system_managed=False)
        updated = custom.model_copy(update={"name": "分析师"})
        fake_repo = MagicMock()
        fake_repo.get_by_id = AsyncMock(return_value=custom)
        fake_repo.update_role = AsyncMock(return_value=updated)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            result = await api.update_tenant_role(3, RoleUpdate(name="分析师"))
        assert result.name == "分析师"
        fake_repo.update_role.assert_awaited_once()

    asyncio.run(_run())


def test_create_tenant_role_allows_new_code() -> None:
    async def _run() -> None:
        created = _role(10, "analyst", system_managed=False)
        fake_repo = MagicMock()
        fake_repo.get_by_code = AsyncMock(return_value=None)
        fake_repo.create_role = AsyncMock(return_value=created)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            result = await api.create_tenant_role(RoleCreate(code="analyst", name="分析师"))
        assert result.code == "analyst"
        fake_repo.create_role.assert_awaited_once_with(
            RoleCreate(code="analyst", name="分析师"),
            42,
            system_managed=False,
        )

    asyncio.run(_run())


def test_create_tenant_role_allows_admin_code_as_custom_role() -> None:
    async def _run() -> None:
        created = _role(4, ROLE_ADMIN, system_managed=False)
        fake_repo = MagicMock()
        fake_repo.get_by_code = AsyncMock(return_value=None)
        fake_repo.create_role = AsyncMock(return_value=created)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            result = await api.create_tenant_role(
                RoleCreate(code=ROLE_ADMIN, name="自定义管理员")
            )
        assert result.code == ROLE_ADMIN
        assert result.system_managed is False
        fake_repo.create_role.assert_awaited_once_with(
            RoleCreate(code=ROLE_ADMIN, name="自定义管理员"),
            42,
            system_managed=False,
        )

    asyncio.run(_run())


def test_set_tenant_role_permissions_allows_custom_admin_role() -> None:
    async def _run() -> None:
        custom_admin = _role(4, ROLE_ADMIN, system_managed=False)
        updated = custom_admin.model_copy(update={"permissions": ["menu.tenant_users"]})
        fake_repo = MagicMock()
        fake_repo.get_by_id = AsyncMock(return_value=custom_admin)
        fake_repo.set_role_permissions = AsyncMock(return_value=updated)
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
            patch.object(api.AuditService, "record_operation", AsyncMock()),
        ):
            result = await api.set_tenant_role_permissions(
                4, RolePermissionsPatch(permissions=["menu.tenant_users"])
            )
        assert result.id == 4
        fake_repo.set_role_permissions.assert_awaited_once()

    asyncio.run(_run())


def test_create_tenant_role_rejects_duplicate_code() -> None:
    async def _run() -> None:
        fake_repo = MagicMock()
        fake_repo.get_by_code = AsyncMock(return_value=_role(2, ROLE_OPERATOR, system_managed=True))
        with (
            patch.object(api, "current_tenant_id", return_value=42),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            with pytest.raises(HTTPException) as exc:
                await api.create_tenant_role(
                    RoleCreate(code=ROLE_OPERATOR, name="操作员")
                )
        assert exc.value.status_code == 400
        assert exc.value.detail == "角色 code 已存在"
        fake_repo.create_role.assert_not_called()

    asyncio.run(_run())


def test_list_tenant_roles_uses_list_all_roles() -> None:
    async def _run() -> None:
        preset = _role(1, ROLE_OPERATOR, system_managed=True)
        custom = _role(4, "superAdmin", system_managed=False)
        fake_repo = MagicMock()
        fake_repo.list_all_roles = AsyncMock(return_value=[preset, custom])
        fake_repo.list_roles = AsyncMock(return_value=[preset])
        with (
            patch.object(api, "current_tenant_id", return_value=1),
            patch.object(api, "_repo", return_value=fake_repo),
        ):
            result = await api.list_tenant_roles()
        assert len(result) == 2
        fake_repo.list_all_roles.assert_awaited_once()
        fake_repo.list_roles.assert_not_called()

    asyncio.run(_run())
