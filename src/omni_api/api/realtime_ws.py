"""单通道实时 WebSocket：币安式多路订阅。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from omni_api.data.mysql.tenant_context import set_session
from omni_api.schemas.realtime import RealtimeClientMessage
from omni_api.services.auth_credentials import AuthError
from omni_api.services.realtime_hub import RealtimeConnection, realtime_hub
from omni_api.services.session_service import SessionService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["realtime"])


@router.websocket("/api/v1/ws")
async def realtime_ws(websocket: WebSocket) -> None:
    token = (websocket.query_params.get("token") or "").strip()
    if not token:
        await websocket.close(code=4401)
        return
    try:
        session = await SessionService().resolve(token)
    except AuthError:
        await websocket.close(code=4401)
        return
    if session is None:
        await websocket.close(code=4401)
        return

    await websocket.accept()
    set_session(session)
    perms_raw = session.get("permissions") or []
    permissions = frozenset(str(p) for p in perms_raw)
    tenant_raw = session.get("tenant_id")
    conn = RealtimeConnection(
        websocket=websocket,
        token=token,
        user_id=int(session["user_id"]),
        tenant_id=int(tenant_raw) if tenant_raw is not None else None,
        permissions=permissions,
    )
    hub = realtime_hub()
    await hub.register(conn)
    try:
        await _serve(conn)
    finally:
        await hub.unregister(conn)


async def _serve(conn: RealtimeConnection) -> None:
    try:
        while True:
            raw = await conn.websocket.receive_json()
            await _handle_client_raw(conn, raw)
    except WebSocketDisconnect:
        return
    except Exception:
        logger.debug("实时连接异常 user=%s", conn.user_id, exc_info=True)


async def _handle_client_raw(conn: RealtimeConnection, raw: object) -> None:
    if not isinstance(raw, dict):
        return
    try:
        msg = RealtimeClientMessage.model_validate(raw)
    except Exception:
        await conn.websocket.send_json({"op": "error", "message": "消息格式无效"})
        return
    await _dispatch(conn, msg)


async def _dispatch(conn: RealtimeConnection, msg: RealtimeClientMessage) -> None:
    hub = realtime_hub()
    if msg.op == "ping":
        await conn.websocket.send_json({"op": "pong"})
        return
    if msg.op == "subscribe":
        await hub.subscribe(conn, msg.channels)
        return
    if msg.op == "unsubscribe":
        await hub.unsubscribe(conn, msg.channels)
