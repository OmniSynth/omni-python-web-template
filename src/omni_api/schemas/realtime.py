"""实时通道（单连接多订阅）协议与频道常量。"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

CHANNEL_EXPORT_JOB_BADGE = "export_job.badge"
CHANNEL_EXPORT_JOB_MINE = "export_job.mine"
CHANNEL_AUTH_SESSION = "auth.session"

FIXED_CHANNELS = frozenset(
    {
        CHANNEL_EXPORT_JOB_BADGE,
        CHANNEL_EXPORT_JOB_MINE,
        CHANNEL_AUTH_SESSION,
    }
)

CHANNEL_PERMISSIONS: dict[str, str | None] = {
    CHANNEL_EXPORT_JOB_BADGE: "export.job.list",
    CHANNEL_EXPORT_JOB_MINE: "export.job.list",
    CHANNEL_AUTH_SESSION: None,
}

ClientOp = Literal["subscribe", "unsubscribe", "ping"]
ServerOp = Literal["subscribed", "unsubscribed", "pong", "event", "error"]
EventType = Literal["update", "changed", "snapshot"]


class RealtimeClientMessage(BaseModel):
    op: ClientOp
    channels: list[str] = Field(default_factory=list)


class RealtimeServerMessage(BaseModel):
    op: ServerOp
    channels: list[str] | None = None
    channel: str | None = None
    type: EventType | None = None
    payload: dict[str, Any] | None = None
    message: str | None = None
