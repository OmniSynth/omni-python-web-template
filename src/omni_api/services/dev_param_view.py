"""开发参数展示与脱敏（系统/租户共用）。"""

from __future__ import annotations

from omni_api.schemas.dev_param import (
    DevParamDef,
    DevParamItemView,
    DevParamRecord,
    DevParamSelectOption,
)
from omni_api.schemas.oss_param import OSS_SECRET_KEYS


def build_param_item_view(
    meta: DevParamDef,
    rec: DevParamRecord | None,
    *,
    editable: bool = True,
) -> DevParamItemView:
    """将定义与库记录转为前端视图；密码字段脱敏。"""
    raw = rec.param_value if rec else ""
    is_secret = meta.param_key in OSS_SECRET_KEYS or meta.field_type == "password"
    configured = bool(raw.strip()) if is_secret else False
    display = "" if is_secret else raw
    return DevParamItemView(
        param_key=meta.param_key,
        param_value=display,
        remark=rec.remark if rec else "",
        updated_at=rec.updated_at if rec else None,
        label=meta.label,
        field_type=meta.field_type,
        description=meta.description,
        placeholder=meta.placeholder,
        editable=editable,
        configured=configured,
        select_options=[
            DevParamSelectOption(value=v, label=lbl) for v, lbl in meta.select_options
        ],
    )


def resolve_param_write_value(
    meta: DevParamDef,
    incoming: str,
    existing: str | None,
) -> str:
    """密码字段空值表示保持原值。"""
    if meta.param_key in OSS_SECRET_KEYS or meta.field_type == "password":
        if not incoming.strip():
            return existing if existing is not None else ""
    return incoming


def redact_param_for_audit(
    param_key: str,
    payload: dict | DevParamItemView | DevParamRecord | None,
) -> dict | None:
    """审计 before/after：密钥参数值脱敏。"""
    if payload is None:
        return None
    data = payload.model_dump() if hasattr(payload, "model_dump") else dict(payload)
    if param_key in OSS_SECRET_KEYS:
        val = str(data.get("param_value") or "")
        data["param_value"] = "***" if val.strip() else ""
    return data
