"""平台系统角色仓储测试。"""

from __future__ import annotations

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from omni_api.data.mysql.sys_role_repo import SysRoleRepo


def test_sys_role_repo_list_roles() -> None:
    async def _run() -> None:
        now = datetime(2026, 1, 1)
        conn = MagicMock()
        conn.execute = AsyncMock(
            side_effect=[
                MagicMock(
                    fetchall=lambda: [(1, "admin", "管理员", "", "system", now, now)]
                ),
                MagicMock(fetchall=lambda: [(1, "system.user.list")]),
            ]
        )
        engine = MagicMock()
        engine.connect = MagicMock()
        engine.connect.return_value.__aenter__ = AsyncMock(return_value=conn)
        engine.connect.return_value.__aexit__ = AsyncMock(return_value=None)

        repo = SysRoleRepo(engine)
        roles = await repo.list_roles()

        assert len(roles) == 1
        assert roles[0].code == "admin"

    asyncio.run(_run())


def test_ensure_default_roles_creates_missing_admin() -> None:
    async def _run() -> None:
        repo = SysRoleRepo(MagicMock())
        repo.ensure_schema = AsyncMock()
        repo.get_by_code = AsyncMock(return_value=None)
        repo.create_role = AsyncMock(
            side_effect=lambda body: MagicMock(
                id=1, code=body.code, name=body.name, permissions=[]
            )
        )
        repo.sync_admin_permissions = AsyncMock(return_value=[])
        repo._perm_repo.expand_codes = AsyncMock(return_value=["menu.depts"])

        created: list[str] = []

        async def _track_create(body):
            created.append(body.code)
            return MagicMock(id=len(created), code=body.code, permissions=[])

        repo.create_role = AsyncMock(side_effect=_track_create)
        repo.set_role_permissions = AsyncMock(return_value=MagicMock())

        async def _get_by_code(code: str):
            if code == "admin" and "admin" in created:
                return MagicMock(id=1, code="admin", permissions=["system.user.list"])
            if code == "operator" and "operator" in created:
                return MagicMock(id=2, code="operator", permissions=["menu.depts"])
            if code == "viewer" and "viewer" in created:
                return MagicMock(id=3, code="viewer", permissions=["menu.depts"])
            return None

        repo.get_by_code = AsyncMock(side_effect=_get_by_code)

        await repo.ensure_default_roles()

        assert created == ["admin", "operator", "viewer"]
        repo.sync_admin_permissions.assert_awaited()

    asyncio.run(_run())


def test_sys_role_repo_assign_role_by_code() -> None:
    async def _run() -> None:
        repo = SysRoleRepo(MagicMock())
        repo.get_by_code = AsyncMock(
            return_value=MagicMock(id=1, code="admin", permissions=["system.user.list"])
        )
        conn = MagicMock()
        conn.execute = AsyncMock()
        begin = MagicMock()
        begin.__aenter__ = AsyncMock(return_value=conn)
        begin.__aexit__ = AsyncMock(return_value=None)
        repo._engine.begin = MagicMock(return_value=begin)

        await repo.assign_role_by_code(10, "admin")

        repo.get_by_code.assert_awaited_once_with("admin")
        conn.execute.assert_awaited()

    asyncio.run(_run())


def test_expand_nav_codes_maps_api_to_menu() -> None:
    async def _run() -> None:
        from omni_api.data.mysql.permission_repo import PermissionRepo
        from omni_api.schemas.rbac import PermissionRecord

        now = datetime(2026, 1, 1)
        perms = [
            PermissionRecord(
                id=1,
                code="catalog.system",
                name="系统",
                kind="catalog",
                parent_id=None,
                sort_order=0,
                enabled=True,
                route_path=None,
                component_key=None,
                api_method=None,
                api_path_pattern=None,
                description="",
                is_system=True,
                created_at=now,
                updated_at=now,
            ),
            PermissionRecord(
                id=2,
                code="menu.users",
                name="用户",
                kind="menu",
                parent_id=1,
                sort_order=0,
                enabled=True,
                route_path="/users",
                component_key="users",
                api_method=None,
                api_path_pattern=None,
                description="",
                is_system=True,
                created_at=now,
                updated_at=now,
            ),
        ]
        repo = PermissionRepo(MagicMock())
        repo.list_all = AsyncMock(return_value=perms)
        repo.load_bindings_map = AsyncMock(
            return_value={"menu.users": ["system.user.list"]}
        )

        expanded = await repo.expand_nav_codes({"system.user.list"})

        assert "menu.users" in expanded
        assert "catalog.system" in expanded

    asyncio.run(_run())
