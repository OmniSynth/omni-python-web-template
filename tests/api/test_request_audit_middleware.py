"""请求审计中间件辅助函数测试。"""

from __future__ import annotations

import asyncio
import json
from unittest.mock import AsyncMock, MagicMock

from omni_api.api.request_audit_middleware import (
    _extract_error_detail,
    _resolve_request_body_size,
)
from omni_api.services.audit_service import AuditService


def test_extract_error_detail_from_json() -> None:
    body = json.dumps({"detail": "无权限"}).encode()
    assert _extract_error_detail(body, 403) == "无权限"


def test_extract_error_detail_skips_success() -> None:
    assert _extract_error_detail(b'{"detail":"x"}', 200) is None


def test_resolve_request_body_size_from_content_length() -> None:
    async def _run() -> None:
        request = MagicMock()
        request.method = "POST"
        request.headers = {"Content-Length": "128"}
        assert await _resolve_request_body_size(request) == 128

    asyncio.run(_run())


def test_resolve_request_body_size_reads_body_without_header() -> None:
    async def _run() -> None:
        request = MagicMock()
        request.method = "POST"
        request.headers = {}
        request.body = AsyncMock(return_value=b'{"name":"alice"}')
        assert await _resolve_request_body_size(request) == 16

    asyncio.run(_run())


def test_record_request_uses_explicit_snapshot_fields() -> None:
    async def _run() -> None:
        repo = MagicMock()
        repo.insert_request_log = AsyncMock()
        svc = AuditService(repo=repo)
        await svc.record_request(
            request_id="rid-1",
            method="POST",
            path="/api/v1/users",
            query_string=None,
            status_code=403,
            duration_ms=12,
            user_id=1,
            username="alice",
            tenant_id=42,
            auth_status="authenticated",
            client_ip="10.0.0.1",
            user_agent="TestAgent/1.0",
            permission_code="system.user.create",
            error_detail="无权限",
            request_body_size=256,
            response_body_size=64,
        )
        data = repo.insert_request_log.await_args.args[0]
        assert data["client_ip"] == "10.0.0.1"
        assert data["user_agent"] == "TestAgent/1.0"
        assert data["tenant_id"] == 42
        assert data["permission_code"] == "system.user.create"
        assert data["error_detail"] == "无权限"
        assert data["request_body_size"] == 256

    asyncio.run(_run())
