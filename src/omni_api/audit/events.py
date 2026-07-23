"""操作审计事件分类（参考注册表）。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

AuditLevel = Literal["system", "business"]


@dataclass(frozen=True, slots=True)
class AuditEventDef:
  category: str
  action: str
  level: AuditLevel
  summary_template: str


# 常用事件定义，供文档与一致性参考
AUDIT_EVENTS: dict[tuple[str, str], AuditEventDef] = {
    ("auth", "login"): AuditEventDef("auth", "login", "system", "用户登录：{username}"),
    ("auth", "login_failed"): AuditEventDef(
        "auth", "login_failed", "system", "登录失败：{username}"
    ),
    ("auth", "permission_denied"): AuditEventDef(
        "auth", "permission_denied", "system", "权限拒绝：{permission_code}"
    ),
    ("user", "create"): AuditEventDef("user", "create", "system", "创建用户：{username}"),
    ("user", "update"): AuditEventDef("user", "update", "system", "更新用户：{username}"),
    ("user", "enable"): AuditEventDef("user", "enable", "system", "变更用户状态：{username}"),
    ("role", "create"): AuditEventDef("role", "create", "system", "创建角色：{code}"),
    ("role", "assign_permission"): AuditEventDef(
        "role", "assign_permission", "system", "分配角色权限：{code}"
    ),
    ("audit", "export"): AuditEventDef("audit", "export", "system", "导出审计日志"),
}


def format_summary(category: str, action: str, **kwargs: str) -> str:
    key = (category, action)
    tmpl = AUDIT_EVENTS.get(key)
    if tmpl is None:
        return f"{category}.{action}"
    try:
        return tmpl.summary_template.format(**kwargs)
    except KeyError:
        return tmpl.summary_template
