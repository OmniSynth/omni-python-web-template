"""租户用户离职仓储测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.schemas.tenant import MEMBERSHIP_ACTIVE, MEMBERSHIP_DEPARTED, UserTenantBinding


def test_depart_user_raises_when_already_departed() -> None:
    async def _run() -> None:
        repo = TenantRepo(MagicMock())
        repo.get_user_binding = AsyncMock(
            return_value=UserTenantBinding(
                user_id=1,
                tenant_id=2,
                membership_status=MEMBERSHIP_DEPARTED,
            )
        )
        with pytest.raises(ValueError, match="用户已离职"):
            await repo.depart_user(1, 2)

    asyncio.run(_run())


def test_unbind_user_delegates_to_depart_user() -> None:
    async def _run() -> None:
        repo = TenantRepo(MagicMock())
        repo.depart_user = AsyncMock()
        await repo.unbind_user(3, 4)
        repo.depart_user.assert_awaited_once_with(3, 4)

    asyncio.run(_run())


def test_list_user_bindings_filters_departed() -> None:
    async def _run() -> None:
        repo = TenantRepo(MagicMock())
        conn = MagicMock()
        conn.execute = AsyncMock(
            return_value=MagicMock(
                fetchall=MagicMock(
                    return_value=[(1, 2, 10, 1, None, MEMBERSHIP_ACTIVE)]
                )
            )
        )
        repo._engine.connect = MagicMock(
            return_value=MagicMock(
                __aenter__=AsyncMock(return_value=conn),
                __aexit__=AsyncMock(return_value=None),
            )
        )
        bindings = await repo.list_user_bindings(1)
        assert len(bindings) == 1
        assert bindings[0].membership_status == MEMBERSHIP_ACTIVE
        sql_text = str(conn.execute.await_args.args[0])
        assert "membership_status=:ms" in sql_text

    asyncio.run(_run())


def test_bind_user_reactivates_on_duplicate() -> None:
    async def _run() -> None:
        repo = TenantRepo(MagicMock())
        repo._require_valid_dept = AsyncMock(return_value=5)
        conn = MagicMock()
        conn.execute = AsyncMock()
        repo._engine.begin = MagicMock(
            return_value=MagicMock(
                __aenter__=AsyncMock(return_value=conn),
                __aexit__=AsyncMock(return_value=None),
            )
        )
        with patch(
            "omni_api.data.mysql.user_data_scope_repo.UserDataScopeRepo"
        ) as scope_cls:
            scope_cls.return_value.set_scopes = AsyncMock()
            await repo.bind_user(1, 2, dept_id=5)
        sql_text = str(conn.execute.await_args.args[0])
        assert "membership_status=:ms" in sql_text
        params = conn.execute.await_args.args[1]
        assert params["ms"] == MEMBERSHIP_ACTIVE

    asyncio.run(_run())
