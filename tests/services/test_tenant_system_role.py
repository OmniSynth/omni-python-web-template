"""租户系统角色绑定校验测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from omni_api.data.mysql.tenant_system_role_repo import validate_bindable_role_codes
from omni_api.schemas.sys_role_type import ROLE_TYPE_SYSTEM, ROLE_TYPE_TENANT


def _role(code: str, role_type: str) -> MagicMock:
    role = MagicMock()
    role.code = code
    role.role_type = role_type
    return role


def test_validate_bindable_role_codes_ok() -> None:
    async def _run() -> None:
        engine = MagicMock()
        sys_repo = MagicMock()
        sys_repo.get_by_code = AsyncMock(
            side_effect=lambda code: {
                "operator": _role("operator", ROLE_TYPE_TENANT),
                "viewer": _role("viewer", ROLE_TYPE_TENANT),
            }.get(code)
        )

        from omni_api.data.mysql import tenant_system_role_repo

        original = tenant_system_role_repo.SysRoleRepo
        tenant_system_role_repo.SysRoleRepo = MagicMock(return_value=sys_repo)
        try:
            result = await validate_bindable_role_codes(engine, ["operator", "viewer"])
            assert result == ["operator", "viewer"]
        finally:
            tenant_system_role_repo.SysRoleRepo = original

    asyncio.run(_run())


def test_validate_bindable_role_codes_rejects_admin() -> None:
    async def _run() -> None:
        engine = MagicMock()
        sys_repo = MagicMock()
        sys_repo.get_by_code = AsyncMock(return_value=_role("admin", ROLE_TYPE_SYSTEM))

        from omni_api.data.mysql import tenant_system_role_repo

        original = tenant_system_role_repo.SysRoleRepo
        tenant_system_role_repo.SysRoleRepo = MagicMock(return_value=sys_repo)
        try:
            with pytest.raises(ValueError, match="不可绑定"):
                await validate_bindable_role_codes(engine, ["admin"])
        finally:
            tenant_system_role_repo.SysRoleRepo = original

    asyncio.run(_run())


def test_validate_bindable_role_codes_requires_one() -> None:
    async def _run() -> None:
        engine = MagicMock()
        with pytest.raises(ValueError, match="至少绑定"):
            await validate_bindable_role_codes(engine, [])

    asyncio.run(_run())
