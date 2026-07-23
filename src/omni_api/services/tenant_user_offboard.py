"""租户用户离职编排。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.tenant import MEMBERSHIP_DEPARTED
from omni_api.services.session_service import SessionService


class TenantUserOffboardService:
    """将用户从当前租户标记为离职并阻断会话访问。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._users = UserRepo(engine)
        self._tenants = TenantRepo(engine)
        self._sessions = SessionService()

    async def offboard(
        self,
        tenant_id: int,
        user_id: int,
        *,
        actor_id: int,
    ) -> tuple[UserRecord, UserRecord]:
        if user_id == actor_id:
            raise ValueError("不能离职自己")
        admin_id = await self._tenants.get_admin_user_id(tenant_id)
        if admin_id is not None and admin_id == user_id:
            raise ValueError("不能离职租户管理员，请先更换管理员")
        before = await self._users.get_by_id(user_id, tenant_id)
        if before is None:
            raise ValueError("用户不存在")
        if before.membership_status == MEMBERSHIP_DEPARTED:
            raise ValueError("用户已离职")
        await self._tenants.depart_user(user_id, tenant_id)
        await self._sessions.invalidate_tenant_access(user_id, tenant_id)
        after = await self._users.get_by_id(user_id, tenant_id)
        assert after is not None
        return before, after
