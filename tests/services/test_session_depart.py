"""离职后会话降级测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from omni_api.services.session_resolve_cache import _MISSING
from omni_api.services.session_service import SessionService


def test_resolve_degrades_inactive_tenant_session() -> None:
    async def _run() -> None:
        service = SessionService()
        session = {
            "user_id": 9,
            "username": "u9",
            "display_name": "用户9",
            "tenant_id": 2,
            "dept_id": 1,
            "roles": ["operator"],
            "permissions": ["tenant.user.list"],
            "bound_tenants": [{"id": 2}],
            "need_tenant_select": False,
        }
        degraded = {
            "user_id": 9,
            "username": "u9",
            "display_name": "用户9",
            "tenant_id": None,
            "dept_id": None,
            "roles": [],
            "permissions": [],
            "bound_tenants": [],
            "need_tenant_select": True,
        }
        service._store.get = MagicMock(return_value=session)
        service._store.update = MagicMock(return_value=degraded)
        service._users.get_by_id = AsyncMock(return_value=MagicMock(enabled=True))
        service._tenants.is_user_active_in_tenant = AsyncMock(return_value=False)
        service._degrade_session_snapshot = AsyncMock(return_value=degraded)
        with patch(
            "omni_api.services.session_service.get_cached_session",
            return_value=_MISSING,
        ), patch(
            "omni_api.services.session_service.set_cached_session"
        ):
            result = await service.resolve("a" * 32)
        assert result is not None
        assert result["need_tenant_select"] is True
        assert result["tenant_id"] is None
        service._degrade_session_snapshot.assert_awaited_once()

    asyncio.run(_run())


def test_invalidate_tenant_access_patches_matching_sessions() -> None:
    async def _run() -> None:
        service = SessionService()
        session = {
            "user_id": 9,
            "username": "u9",
            "display_name": "用户9",
            "tenant_id": 2,
            "dept_id": 1,
            "roles": ["operator"],
            "permissions": ["tenant.user.list"],
            "bound_tenants": [{"id": 2}],
            "need_tenant_select": False,
        }
        degraded = {**session, "tenant_id": None, "need_tenant_select": True, "roles": [], "permissions": []}
        service._store.list_user_tokens = MagicMock(return_value=["b" * 32])
        service._store.get = MagicMock(return_value=session)
        service._store.update = MagicMock(return_value=degraded)
        service._degrade_session_snapshot = AsyncMock(return_value=degraded)
        await service.invalidate_tenant_access(9, 2)
        service._store.update.assert_called_once()

    asyncio.run(_run())
