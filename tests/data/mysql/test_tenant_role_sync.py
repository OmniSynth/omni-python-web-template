"""租户系统角色权限同步测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from omni_api.auth.permission_seed import (
    DEFAULT_ROLE_DEFS,
    ROLE_ADMIN,
    ROLE_OPERATOR,
    ROLE_VIEWER,
    tenant_admin_baseline_codes,
)
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.schemas.rbac import RoleRecord


def _role(role_id: int, code: str, perms: list[str]) -> RoleRecord:
    now = datetime(2026, 1, 1)
    return RoleRecord(
        id=role_id,
        code=code,
        name=code,
        description="",
        permissions=perms,
        created_at=now,
        updated_at=now,
    )


def _template_perms(code: str) -> list[str] | None:
    if code not in DEFAULT_ROLE_DEFS:
        return None
    return list(DEFAULT_ROLE_DEFS[code][2])


def test_sync_tenant_system_role_permissions_includes_tenant_baseline_and_bindings() -> None:
    async def _run() -> None:
        perm_repo = MagicMock()
        perm_repo.expand_codes = AsyncMock(side_effect=lambda codes: sorted(set(codes)))
        perm_repo.validate_codes = AsyncMock()

        repo = RoleRepo(MagicMock(), permission_repo=perm_repo)
        repo.get_by_code = AsyncMock(
            return_value=_role(1, ROLE_ADMIN, ["tenant.user.list"])
        )
        repo._list_all_roles = AsyncMock(
            return_value=[_role(2, ROLE_OPERATOR, ["menu.depts"])]
        )
        repo.set_role_permissions = AsyncMock()
        repo._sys_role_permissions = AsyncMock(side_effect=_template_perms)

        fake_system_repo = MagicMock()
        fake_system_repo.list_role_codes = AsyncMock(return_value=["operator"])

        with patch(
            "omni_api.data.mysql.role_repo.TenantSystemRoleRepo",
            return_value=fake_system_repo,
        ):
            await repo.sync_tenant_system_role_permissions(
                1004, previous_bindings=[]
            )

        admin_perms = repo.set_role_permissions.await_args_list[0].args[1]
        assert "tenant.user.create" in admin_perms
        assert "tenant.user.list" in admin_perms
        assert "system.user.list" not in admin_perms
        assert repo.set_role_permissions.await_count == 1

    asyncio.run(_run())


def test_sync_tenant_system_role_permissions_without_admin() -> None:
    async def _run() -> None:
        perm_repo = MagicMock()
        perm_repo.expand_codes = AsyncMock(side_effect=lambda codes: sorted(set(codes)))
        perm_repo.validate_codes = AsyncMock()

        operator = _role(2, ROLE_OPERATOR, ["menu.depts"])
        viewer = _role(3, ROLE_VIEWER, ["menu.depts"])

        repo = RoleRepo(MagicMock(), permission_repo=perm_repo)

        async def _get_by_code(code: str, tenant_id: int) -> RoleRecord | None:
            if code == ROLE_ADMIN:
                return None
            if code == ROLE_OPERATOR:
                return operator
            if code == ROLE_VIEWER:
                return viewer
            return None

        repo.get_by_code = AsyncMock(side_effect=_get_by_code)
        repo._list_all_roles = AsyncMock(return_value=[operator, viewer])
        repo.set_role_permissions = AsyncMock()
        repo._sys_role_permissions = AsyncMock(side_effect=_template_perms)

        fake_system_repo = MagicMock()
        fake_system_repo.list_role_codes = AsyncMock(return_value=["operator", "viewer"])

        with patch(
            "omni_api.data.mysql.role_repo.TenantSystemRoleRepo",
            return_value=fake_system_repo,
        ):
            await repo.sync_tenant_system_role_permissions(
                1004, previous_bindings=[]
            )

        assert repo.set_role_permissions.await_count == 2
        operator_perms = repo.set_role_permissions.await_args_list[0].args[1]
        assert "tenant.user.list" in operator_perms
        assert "tenant.user.create" in operator_perms
        viewer_perms = repo.set_role_permissions.await_args_list[1].args[1]
        assert "tenant.user.list" not in viewer_perms

    asyncio.run(_run())


def test_ensure_preset_roles_skips_unselected_admin() -> None:
    async def _run() -> None:
        perm_repo = MagicMock()
        perm_repo.expand_codes = AsyncMock(side_effect=lambda codes: sorted(set(codes)))
        perm_repo.validate_codes = AsyncMock()

        repo = RoleRepo(MagicMock(), permission_repo=perm_repo)
        repo.ensure_schema = AsyncMock()
        repo.get_by_code = AsyncMock(return_value=None)
        created_codes: list[str] = []

        async def _create_role(body, tenant_id=None, system_managed=False):
            created_codes.append(body.code)
            return _role(len(created_codes), body.code, [])

        repo.create_role = AsyncMock(side_effect=_create_role)
        repo.set_role_permissions = AsyncMock()

        fake_sys = MagicMock()

        async def _sys_get(code: str):
            if code in (ROLE_OPERATOR, ROLE_VIEWER):
                role_name, desc, perms = DEFAULT_ROLE_DEFS[code]
                sys_role = MagicMock()
                sys_role.code = code
                sys_role.name = role_name
                sys_role.description = desc
                sys_role.role_type = "tenant"
                sys_role.permissions = list(perms)
                return sys_role
            return None

        fake_sys.get_by_code = AsyncMock(side_effect=_sys_get)

        with patch(
            "omni_api.data.mysql.role_repo.SysRoleRepo",
            return_value=fake_sys,
        ):
            await repo.ensure_preset_roles(1004, ["operator", "viewer"])

        assert created_codes == ["operator", "viewer"]
        assert ROLE_ADMIN not in created_codes

    asyncio.run(_run())


def test_sync_tenant_system_role_permissions_removes_from_non_admin() -> None:
    async def _run() -> None:
        perm_repo = MagicMock()
        perm_repo.expand_codes = AsyncMock(side_effect=lambda codes: sorted(set(codes)))
        perm_repo.validate_codes = AsyncMock()

        admin = _role(
            1,
            ROLE_ADMIN,
            list(tenant_admin_baseline_codes()) + ["menu.depts", "tenant.user.create"],
        )
        operator = _role(2, ROLE_OPERATOR, ["menu.depts", "tenant.user.create"])
        viewer = _role(3, ROLE_VIEWER, ["menu.depts"])

        repo = RoleRepo(MagicMock(), permission_repo=perm_repo)
        repo.get_by_code = AsyncMock(return_value=admin)
        repo._list_all_roles = AsyncMock(return_value=[admin, operator, viewer])
        repo.set_role_permissions = AsyncMock()
        repo._sys_role_permissions = AsyncMock(side_effect=_template_perms)

        fake_system_repo = MagicMock()
        fake_system_repo.list_role_codes = AsyncMock(return_value=["viewer"])

        with patch(
            "omni_api.data.mysql.role_repo.TenantSystemRoleRepo",
            return_value=fake_system_repo,
        ):
            await repo.sync_tenant_system_role_permissions(
                1004, previous_bindings=["operator", "viewer"]
            )

        assert repo.set_role_permissions.await_count == 2
        operator_perms = repo.set_role_permissions.await_args_list[1].args[1]
        assert "tenant.user.create" not in operator_perms
        assert "menu.depts" in operator_perms

    asyncio.run(_run())
