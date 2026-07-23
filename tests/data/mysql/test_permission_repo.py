"""PermissionRepo 单元测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

from omni_api.data.mysql.permission_repo import PermissionRepo
from omni_api.schemas.rbac import PermissionCreate, PermissionUpdate


def test_expand_codes_includes_bindings() -> None:
    async def _run() -> None:
        repo = PermissionRepo(MagicMock())
        repo.list_all = AsyncMock(
            return_value=[
                MagicMock(code="menu.tenant_users"),
                MagicMock(code="tenant.user.list"),
                MagicMock(code="tenant.user.create"),
            ]
        )
        repo.load_bindings_map = AsyncMock(
            return_value={
                "menu.tenant_users": ["tenant.user.list"],
                "tenant.user.create": ["tenant.user.create"],
            }
        )

        expanded = await repo.expand_codes(["menu.tenant_users", "tenant.user.create"])

        assert expanded == [
            "menu.tenant_users",
            "tenant.user.create",
            "tenant.user.list",
        ]

    asyncio.run(_run())


def test_validate_codes_rejects_unknown() -> None:
    async def _run() -> None:
        repo = PermissionRepo(MagicMock())
        repo.list_all = AsyncMock(return_value=[MagicMock(code="menu.depts")])

        try:
            await repo.validate_codes(["menu.depts", "bad.code"])
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "bad.code" in str(exc)

    asyncio.run(_run())


def test_create_rejects_duplicate_code() -> None:
    async def _run() -> None:
        repo = PermissionRepo(MagicMock())
        repo.get_by_code = AsyncMock(return_value=MagicMock())

        try:
            await repo.create(
                PermissionCreate(code="menu.depts", name="重复", kind="menu")
            )
            raise AssertionError("应抛出 ValueError")
        except ValueError as exc:
            assert "已存在" in str(exc)

    asyncio.run(_run())


def test_create_rejects_button_and_api() -> None:
    async def _run() -> None:
        repo = PermissionRepo(MagicMock())
        repo.get_by_code = AsyncMock(return_value=None)

        for kind in ("button", "api"):
            try:
                await repo.create(
                    PermissionCreate(code=f"test.{kind}", name="测试", kind=kind)
                )
                raise AssertionError(f"应拒绝创建 {kind}")
            except ValueError as exc:
                assert "种子" in str(exc)

    asyncio.run(_run())


def test_update_allows_menu_move_to_catalog() -> None:
    async def _run() -> None:
        engine = MagicMock()
        execute = AsyncMock()
        engine.begin.return_value.__aenter__.return_value.execute = execute
        repo = PermissionRepo(engine)
        current = MagicMock(
            id=2,
            code="menu.roles",
            kind="menu",
            parent_id=1,
            is_system=True,
        )
        target_parent = MagicMock(id=3, code="catalog.other", kind="catalog")
        repo.get_by_id = AsyncMock(side_effect=[current, target_parent, current])

        await repo.update(2, PermissionUpdate(parent_id=3))

        assert execute.await_count == 1

    asyncio.run(_run())
