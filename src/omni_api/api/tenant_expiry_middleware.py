"""租户套餐过期软锁定：只读、列表上限、禁止翻页/写操作/导出。"""

from __future__ import annotations

import json
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from omni_api.services.session_service import SessionService
from omni_api.services.tenant_expiry import EXPIRED_TENANT_LIST_LIMIT, TENANT_EXPIRED_MSG

_WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

# 过期后仍允许的写接口：登出、切租户、平台续费/机构管理
_WRITE_ALLOW_PREFIXES = (
    "/api/v1/auth/logout",
    "/api/v1/auth/switch-tenant",
    "/api/v1/tenants",
    "/api/v1/orgs",
)

_SKIP_AUTH_PREFIXES = (
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/health",
)


class TenantExpiryMiddleware(BaseHTTPMiddleware):
    """当前会话租户已过期时强制软锁定。"""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if not path.startswith("/api/v1/"):
            return await call_next(request)
        if any(path.startswith(p) for p in _SKIP_AUTH_PREFIXES):
            return await call_next(request)

        expired = await self._session_tenant_expired(request)
        if not expired:
            return await call_next(request)

        method = request.method.upper()
        if method in _WRITE_METHODS and not self._write_allowed(path):
            return self._deny()

        if method in {"GET", "HEAD"} and self._page_beyond_first(request):
            return self._deny()

        response = await call_next(request)
        if method == "GET":
            return await self._truncate_list_response(response)
        return response

    async def _session_tenant_expired(self, request: Request) -> bool:
        auth = request.headers.get("Authorization")
        if not auth or not auth.lower().startswith("bearer "):
            return False
        token = auth[7:].strip()
        if not token:
            return False
        session = await SessionService().resolve(token)
        if session is None:
            return False
        if session.get("need_tenant_select") or session.get("tenant_id") is None:
            return False
        return bool(session.get("tenant_expired"))

    @staticmethod
    def _write_allowed(path: str) -> bool:
        return any(path.startswith(p) for p in _WRITE_ALLOW_PREFIXES)

    @staticmethod
    def _page_beyond_first(request: Request) -> bool:
        raw = request.query_params.get("page")
        if raw is None or raw == "":
            return False
        try:
            return int(raw) > 1
        except ValueError:
            return False

    @staticmethod
    def _deny() -> JSONResponse:
        return JSONResponse(status_code=403, content={"detail": TENANT_EXPIRED_MSG})

    async def _truncate_list_response(self, response: Response) -> Response:
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type:
            return response
        body = await _read_response_body(response)
        try:
            data = json.loads(body.decode("utf-8") or "null")
        except (UnicodeDecodeError, json.JSONDecodeError):
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )
        truncated = _truncate_expired_list_payload(data)
        if truncated is data:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )
        return JSONResponse(content=truncated, status_code=response.status_code)


async def _read_response_body(response: Response) -> bytes:
    """读取响应体。BaseHTTPMiddleware 流式响应有 body_iterator，普通 Response 用 body。"""
    iterator = getattr(response, "body_iterator", None)
    if iterator is None:
        return bytes(getattr(response, "body", b"") or b"")
    chunks: list[bytes] = []
    async for chunk in iterator:
        chunks.append(chunk if isinstance(chunk, bytes) else bytes(chunk))
    return b"".join(chunks)


def _truncate_expired_list_payload(data: Any) -> Any:
    limit = EXPIRED_TENANT_LIST_LIMIT
    if isinstance(data, list):
        return data[:limit] if len(data) > limit else data
    if not isinstance(data, dict):
        return data
    items = data.get("items")
    if isinstance(items, list) and len(items) > limit:
        out = dict(data)
        out["items"] = items[:limit]
        if isinstance(out.get("total"), int) and out["total"] > limit:
            out["total"] = limit
        return out
    return data
