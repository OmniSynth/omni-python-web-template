"""内置定时任务注册表（code → 执行函数）。"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

# handler(manual, tenant_id)：定时调度时 tenant_id 为 None；手动触发传入所选租户。
ScheduledJobHandler = Callable[[bool, int | None], Awaitable[str | None]]


@dataclass(frozen=True, slots=True)
class ScheduledJobDefinition:
    code: str
    name: str
    description: str
    default_cron_expr: str
    handler: ScheduledJobHandler
    requires_tenant: bool = True


async def _run_tenant_expiry_check(manual: bool, tenant_id: int | None) -> str | None:
    from omni_api.services.tenant_expiry import kick_expired_tenant_sessions

    _ = manual
    return await kick_expired_tenant_sessions(tenant_id=tenant_id)


SCHEDULED_JOB_DEFINITIONS: tuple[ScheduledJobDefinition, ...] = (
    ScheduledJobDefinition(
        code="tenant_expiry_check",
        name="租户套餐到期检查",
        description="扫描已到期租户，强制踢下线对应在线会话",
        default_cron_expr="*/5 * * * * *",
        handler=_run_tenant_expiry_check,
        requires_tenant=False,
    ),
)

_DEFINITION_BY_CODE: dict[str, ScheduledJobDefinition] = {
    item.code: item for item in SCHEDULED_JOB_DEFINITIONS
}


def get_job_definition(code: str) -> ScheduledJobDefinition | None:
    return _DEFINITION_BY_CODE.get(code)
