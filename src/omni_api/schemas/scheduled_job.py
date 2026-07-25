"""定时任务 DTO。"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from croniter import croniter
from pydantic import BaseModel, Field, field_validator

from omni_api.schemas.utc_datetime import UtcDateTime

ScheduledJobRunStatus = Literal["success", "failure", "running"]
ScheduledJobScope = Literal["system", "tenant"]


def cron_uses_seconds(expr: str) -> bool:
    """6 段表达式（秒 分 时 日 月 周）为 True。"""
    return len(expr.strip().split()) == 6


def validate_cron_expr(expr: str) -> str:
    """校验 5 段（分起）或 6 段（秒起）cron 表达式。"""
    cleaned = expr.strip()
    parts = cleaned.split()
    if len(parts) == 5:
        if not croniter.is_valid(cleaned):
            raise ValueError("cron 表达式无效")
        return cleaned
    if len(parts) == 6:
        if not croniter.is_valid(cleaned, second_at_beginning=True):
            raise ValueError("cron 表达式无效")
        return cleaned
    raise ValueError("cron 表达式须为 5 段（分 时 日 月 周）或 6 段（秒 分 时 日 月 周）")


def croniter_from_expr(expr: str, start: datetime) -> croniter:
    """按段数构造 croniter（6 段启用秒字段）。"""
    cleaned = validate_cron_expr(expr)
    if cron_uses_seconds(cleaned):
        return croniter(cleaned, start, second_at_beginning=True)
    return croniter(cleaned, start)


class ScheduledJobRecord(BaseModel):
    id: int
    code: str
    name: str
    description: str = ""
    scope: ScheduledJobScope = "tenant"
    cron_expr: str
    enabled: bool
    active: bool = False
    # 与 scope=tenant 等价，兼容旧前端
    requires_tenant: bool = True
    last_run_at: UtcDateTime | None = None
    last_run_status: ScheduledJobRunStatus | None = None
    last_run_message: str = ""
    next_run_at: UtcDateTime | None = None
    created_at: UtcDateTime | None = None
    updated_at: UtcDateTime | None = None


class TenantScheduledJobRecord(BaseModel):
    """租户设置页可见的租户范围任务。"""

    code: str
    name: str
    description: str = ""
    scope: ScheduledJobScope = "tenant"
    cron_expr: str = ""
    schedule_enabled: bool = True
    last_run_at: UtcDateTime | None = None
    last_run_status: ScheduledJobRunStatus | None = None
    next_run_at: UtcDateTime | None = None


class ScheduledJobUpdate(BaseModel):
    cron_expr: str | None = None
    enabled: bool | None = None

    @field_validator("cron_expr")
    @classmethod
    def _check_cron(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_cron_expr(value)


class ScheduledJobTrigger(BaseModel):
    """手动触发：租户级任务须指定租户；系统级任务可不传。"""

    tenant_id: int | None = Field(default=None, gt=0, description="目标租户 ID；系统级任务可省略")


class ScheduledJobStop(BaseModel):
    """停止调度：系统任务不传租户；租户任务可指定租户停止该租户调度。"""

    tenant_id: int | None = Field(default=None, gt=0, description="目标租户 ID；省略则停止任务全局调度")
