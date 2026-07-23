"""require_permission 依赖测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from datetime import datetime

from omni_api.api.deps import require_permission
from omni_api.schemas.auth import UserRecord


def _user() -> UserRecord:
    now = datetime(2026, 1, 1, 12, 0, 0)
    return UserRecord(
        id=1,
        username="admin",
        display_name="管理员",
        enabled=True,
        roles=[],
        created_at=now,
        updated_at=now,
    )


def test_require_permission_denied() -> None:
    async def _run() -> None:
        dep = require_permission("tenant.user.create")
        user = _user()
        session = {"need_tenant_select": False, "permissions": []}
        with (
            patch("omni_api.api.deps.PermissionService") as mock_cls,
            patch("omni_api.api.deps.AuditService") as audit_cls,
            patch("omni_api.api.deps.get_tenant_id", return_value=42),
        ):
            mock_cls.return_value.user_has_permission = AsyncMock(return_value=False)
            audit_cls.return_value.record_operation = AsyncMock()
            with pytest.raises(HTTPException) as exc:
                await dep(user=user, session=session)
        assert exc.value.status_code == 403
        audit_cls.return_value.record_operation.assert_awaited_once()

    asyncio.run(_run())


def test_require_permission_allowed() -> None:
    async def _run() -> None:
        dep = require_permission("tenant.user.create")
        user = _user()
        session = {"need_tenant_select": False, "permissions": ["tenant.user.create"]}
        with (
            patch("omni_api.api.deps.PermissionService") as mock_cls,
            patch("omni_api.api.deps.get_tenant_id", return_value=42),
        ):
            mock_cls.return_value.user_has_permission = AsyncMock(return_value=True)
            result = await dep(user=user, session=session)
        assert isinstance(result, UserRecord)

    asyncio.run(_run())
