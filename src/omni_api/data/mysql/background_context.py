"""后台任务写库时复用租户与操作人上下文。"""

from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass

from omni_api.data.mysql.actor import (
    get_actor_id,
    get_actor_username,
    reset_actor_token,
    reset_actor_username_token,
    set_actor_id,
    set_actor_username,
)
from omni_api.data.mysql.tenant_context import (
    get_context_user_id,
    get_dept_id,
    get_tenant_id,
    reset_dept_id,
    reset_tenant_id,
    reset_user_id,
    set_dept_id,
    set_tenant_id,
    set_user_id,
)


@dataclass(frozen=True)
class BackgroundMysqlContext:
    """训练等后台任务写库所需的请求上下文快照。"""

    tenant_id: int | None
    dept_id: int | None
    user_id: int | None
    actor_id: int | None
    actor_username: str | None


def capture_background_mysql_context() -> BackgroundMysqlContext:
    """捕获当前协程中的租户与操作人上下文。"""
    return BackgroundMysqlContext(
        tenant_id=get_tenant_id(),
        dept_id=get_dept_id(),
        user_id=get_context_user_id(),
        actor_id=get_actor_id(),
        actor_username=get_actor_username(),
    )


@asynccontextmanager
async def use_background_mysql_context(ctx: BackgroundMysqlContext):
    """在目标协程内恢复租户与操作人上下文。"""
    tenant_token = set_tenant_id(ctx.tenant_id)
    dept_token = set_dept_id(ctx.dept_id)
    user_token = set_user_id(ctx.user_id)
    actor_token = set_actor_id(ctx.actor_id)
    name_token = set_actor_username(ctx.actor_username)
    try:
        yield
    finally:
        reset_tenant_id(tenant_token)
        reset_dept_id(dept_token)
        reset_user_id(user_token)
        reset_actor_token(actor_token)
        reset_actor_username_token(name_token)
