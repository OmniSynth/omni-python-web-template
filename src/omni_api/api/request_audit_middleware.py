"""API 请求审计中间件。"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from omni_api.audit.mask import truncate_text
from omni_api.data.mysql.request_context import (
    get_permission_denied_code,
    reset_client_ip,
    reset_http_method,
    reset_http_path,
    reset_permission_denied_code,
    reset_request_id,
    reset_user_agent,
    set_client_ip,
    set_http_method,
    set_http_path,
    set_permission_denied_code,
    set_request_id,
    set_user_agent,
)
from omni_api.data.mysql.tenant_context import get_tenant_id
from omni_api.services.audit_service import AuditService
from omni_api.services.session_resolve_cache import bind_request, unbind_request
from omni_api.services.session_service import SessionService

logger = logging.getLogger(__name__)

_BODY_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()[:45]
    if request.client:
        return request.client.host[:45]
    return None


async def _resolve_request_body_size(request: Request) -> int:
    """解析请求体大小；无 Content-Length 时读取 body（Starlette 会缓存供下游复用）。"""
    content_length = request.headers.get("Content-Length")
    if content_length and content_length.isdigit():
        return int(content_length)
    if request.method in _BODY_METHODS:
        return len(await request.body())
    return 0


def _extract_error_detail(body: bytes, status_code: int) -> str | None:
    """从错误响应体提取 detail 字段或截断纯文本。"""
    if status_code < 400 or not body:
        return None
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        text = body.decode("utf-8", errors="replace").strip()
        return truncate_text(text) if text else None
    detail = payload.get("detail") if isinstance(payload, dict) else None
    if detail is None:
        return None
    if isinstance(detail, str):
        return truncate_text(detail)
    return truncate_text(str(detail))


async def _read_response_body(response: Response) -> bytes:
    """读取响应体。BaseHTTPMiddleware 的流式响应有 body_iterator，普通 Response 用 body。"""
    iterator = getattr(response, "body_iterator", None)
    if iterator is None:
        return bytes(getattr(response, "body", b"") or b"")
    chunks: list[bytes] = []
    async for chunk in iterator:
        chunks.append(chunk if isinstance(chunk, bytes) else bytes(chunk))
    return b"".join(chunks)


async def _buffer_error_response(response: Response) -> tuple[Response, bytes]:
    """缓冲错误响应体以便提取 detail，并重建可返回的 Response。"""
    if response.status_code < 400:
        return response, b""
    body = await _read_response_body(response)
    return (
        Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
            background=response.background,
        ),
        body,
    )


class RequestAuditMiddleware(BaseHTTPMiddleware):
    """记录 /api/ 请求日志并注入 request_id。"""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        if not path.startswith("/api/"):
            return await call_next(request)

        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        rid_token = set_request_id(request_id)
        path_token = set_http_path(path)
        method_token = set_http_method(request.method)
        ip_token = set_client_ip(_client_ip(request))
        ua_token = set_user_agent(request.headers.get("User-Agent"))
        perm_token = set_permission_denied_code(None)
        req_token = bind_request(request)

        user_id: int | None = None
        username: str | None = None
        tenant_id: int | None = None
        auth_status = "anonymous"
        auth = request.headers.get("Authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth[7:].strip()
            if token:
                session = await SessionService().resolve(token)
                if session:
                    user_id = int(session["user_id"])
                    username = str(session.get("username") or "")
                    auth_status = "authenticated"
                    raw_tid = session.get("tenant_id")
                    tenant_id = int(raw_tid) if raw_tid is not None else None
                else:
                    auth_status = "auth_failed"

        request_body_size = await _resolve_request_body_size(request)
        started = time.monotonic()
        status_code = 500
        error_detail: str | None = None
        response_body_size: int | None = None

        try:
            response = await call_next(request)
            status_code = response.status_code
            if auth_status == "authenticated" and status_code == 401:
                auth_status = "auth_failed"
            elif auth_status == "anonymous" and status_code == 401 and auth:
                auth_status = "auth_failed"
            if status_code >= 400 and error_detail is None:
                response, err_body = await _buffer_error_response(response)
                error_detail = _extract_error_detail(err_body, status_code)
            cl = response.headers.get("Content-Length")
            if cl and cl.isdigit():
                response_body_size = int(cl)
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as exc:
            error_detail = truncate_text(str(exc))
            raise
        finally:
            duration_ms = int((time.monotonic() - started) * 1000)
            snap_client_ip = _client_ip(request)
            snap_user_agent = request.headers.get("User-Agent")
            snap_tenant_id = tenant_id if tenant_id is not None else get_tenant_id()
            snap_permission_code = (
                get_permission_denied_code() if status_code == 403 else None
            )

            unbind_request(req_token)
            reset_permission_denied_code(perm_token)
            reset_user_agent(ua_token)
            reset_client_ip(ip_token)
            reset_http_method(method_token)
            reset_http_path(path_token)
            reset_request_id(rid_token)

            async def _persist() -> None:
                try:
                    await AuditService().record_request(
                        request_id=request_id,
                        method=request.method,
                        path=path,
                        query_string=request.url.query or None,
                        status_code=status_code,
                        duration_ms=duration_ms,
                        user_id=user_id,
                        username=username,
                        tenant_id=snap_tenant_id,
                        auth_status=auth_status,
                        client_ip=snap_client_ip,
                        user_agent=snap_user_agent,
                        permission_code=snap_permission_code,
                        error_detail=error_detail,
                        request_body_size=request_body_size,
                        response_body_size=response_body_size,
                    )
                except Exception:
                    logger.exception("异步写入请求审计失败 request_id=%s", request_id)

            asyncio.create_task(_persist())
