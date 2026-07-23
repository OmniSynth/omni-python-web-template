"""内置定时任务注册表（code → 执行函数）。"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

ScheduledJobHandler = Callable[[bool], Awaitable[str | None]]


@dataclass(frozen=True, slots=True)
class ScheduledJobDefinition:
    code: str
    name: str
    description: str
    default_cron_expr: str
    handler: ScheduledJobHandler


SCHEDULED_JOB_DEFINITIONS: tuple[ScheduledJobDefinition, ...] = ()

_DEFINITION_BY_CODE: dict[str, ScheduledJobDefinition] = {
    item.code: item for item in SCHEDULED_JOB_DEFINITIONS
}


def get_job_definition(code: str) -> ScheduledJobDefinition | None:
    return _DEFINITION_BY_CODE.get(code)
