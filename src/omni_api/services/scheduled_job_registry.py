"""内置定时任务注册表（code → 执行函数）。"""

from __future__ import annotations

from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Any

from omni_api.schemas.scheduled_job import JobRunOutcome, ScheduledJobScope

# handler(manual, tenant_id, params)：系统任务 tenant_id 可为 None；租户任务须带租户。
ScheduledJobHandler = Callable[
    [bool, int | None, Mapping[str, Any] | None],
    Awaitable[str | JobRunOutcome | None],
]

TRIGGER_ACCEPTED_MSG = "同步任务已开始执行"


@dataclass(frozen=True, slots=True)
class ScheduledJobDefinition:
    code: str
    name: str
    description: str
    default_cron_expr: str
    handler: ScheduledJobHandler
    scope: ScheduledJobScope = "tenant"

    @property
    def requires_tenant(self) -> bool:
        return self.scope == "tenant"


async def _run_tenant_expiry_check(
    manual: bool,
    tenant_id: int | None,
    _params: Mapping[str, Any] | None = None,
) -> str | None:
    from omni_api.services.tenant_expiry import sync_expired_tenant_session_flags

    _ = manual
    return await sync_expired_tenant_session_flags(tenant_id=tenant_id)


SCHEDULED_JOB_DEFINITIONS: tuple[ScheduledJobDefinition, ...] = (
    ScheduledJobDefinition(
        code="tenant_expiry_check",
        name="租户套餐到期检查",
        description="扫描已到期租户，将会话标记为软锁定（只读，不踢下线）",
        default_cron_expr="*/5 * * * * *",
        handler=_run_tenant_expiry_check,
        scope="system",
    ),
)

_DEFINITION_BY_CODE: dict[str, ScheduledJobDefinition] = {
    item.code: item for item in SCHEDULED_JOB_DEFINITIONS
}


def get_job_definition(code: str) -> ScheduledJobDefinition | None:
    return _DEFINITION_BY_CODE.get(code)


def list_job_definitions(*, scope: ScheduledJobScope | None = None) -> list[ScheduledJobDefinition]:
    if scope is None:
        return list(SCHEDULED_JOB_DEFINITIONS)
    return [item for item in SCHEDULED_JOB_DEFINITIONS if item.scope == scope]
