"""定时任务 DTO。"""

from __future__ import annotations

from typing import Literal

from croniter import croniter
from pydantic import BaseModel, field_validator

from omni_api.schemas.utc_datetime import UtcDateTime

ScheduledJobRunStatus = Literal["success", "failure", "running"]


def validate_cron_expr(expr: str) -> str:
    """校验标准 5 段 cron 表达式。"""
    cleaned = expr.strip()
    parts = cleaned.split()
    if len(parts) != 5:
        raise ValueError("cron 表达式须为 5 段：分 时 日 月 周")
    if not croniter.is_valid(cleaned):
        raise ValueError("cron 表达式无效")
    return cleaned


class ScheduledJobRecord(BaseModel):
    id: int
    code: str
    name: str
    description: str = ""
    cron_expr: str
    enabled: bool
    active: bool = False
    last_run_at: UtcDateTime | None = None
    last_run_status: ScheduledJobRunStatus | None = None
    last_run_message: str = ""
    next_run_at: UtcDateTime | None = None
    created_at: UtcDateTime | None = None
    updated_at: UtcDateTime | None = None


class ScheduledJobUpdate(BaseModel):
    cron_expr: str | None = None
    enabled: bool | None = None

    @field_validator("cron_expr")
    @classmethod
    def _check_cron(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_cron_expr(value)
