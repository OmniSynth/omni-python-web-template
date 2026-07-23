"""审计服务测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

from omni_api.schemas.audit_log import RequestLogQuery
from omni_api.services.audit_service import AuditService


def test_record_operation_masks_password() -> None:
    async def _run() -> None:
        repo = MagicMock()
        repo.insert_operation_log = AsyncMock()
        svc = AuditService(repo=repo)
        await svc.record_operation(
            category="user",
            action="create",
            before={"password": "x"},
            after={"password": "y"},
            username="alice",
        )
        repo.insert_operation_log.assert_awaited_once()
        data = repo.insert_operation_log.await_args.args[0]
        assert data["before_json"]["password"] == "***"
        assert data["after_json"]["password"] == "***"

    asyncio.run(_run())


def test_record_operation_fills_actor_from_context() -> None:
    async def _run() -> None:
        from omni_api.data.mysql.actor import (
            reset_actor_token,
            reset_actor_username_token,
            set_actor_id,
            set_actor_username,
        )

        repo = MagicMock()
        repo.insert_operation_log = AsyncMock()
        svc = AuditService(repo=repo)
        id_token = set_actor_id(9)
        name_token = set_actor_username("bob")
        try:
            await svc.record_operation(
                category="permission",
                action="update",
                code="tenant.user.create",
            )
        finally:
            reset_actor_username_token(name_token)
            reset_actor_token(id_token)
        data = repo.insert_operation_log.await_args.args[0]
        assert data["actor_id"] == 9
        assert data["actor_username"] == "bob"

    asyncio.run(_run())


def test_list_requests_delegates() -> None:
    async def _run() -> None:
        repo = MagicMock()
        repo.list_request_logs = AsyncMock(return_value=MagicMock(items=[], total=0))
        svc = AuditService(repo=repo)
        q = RequestLogQuery(page=1, page_size=10)
        await svc.list_requests(q)
        repo.list_request_logs.assert_awaited_once()
        call_args = repo.list_request_logs.await_args
        assert call_args.args[0] == q
        assert "scope_clause" in call_args.kwargs

    asyncio.run(_run())
