"""租户管理员绑定与更换。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.auth.permissions import ROLE_ADMIN
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.tenant_system_role_repo import TenantSystemRoleRepo
from omni_api.data.mysql.user_repo import UserRepo


class TenantAdminService:
    """绑定/更换租户管理员；原管理员仅移除 admin 角色。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._tenants = TenantRepo(engine)
        self._users = UserRepo(engine)
        self._roles = RoleRepo(engine)

    async def bind_admin(
        self,
        tenant_id: int,
        user_id: int,
        *,
        dept_id: int | None = None,
    ) -> None:
        tenant = await self._tenants.get_by_id(tenant_id)
        if tenant is None:
            raise ValueError("租户不存在")
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise ValueError("用户不存在")
        if not user.enabled:
            raise ValueError("不能绑定已禁用的用户为管理员")

        previous_admin_id = await self._tenants.get_admin_user_id(tenant_id)
        if previous_admin_id == user_id:
            if dept_id is not None:
                await self._tenants.bind_user(user_id, tenant_id, dept_id=dept_id)
            return

        if not await self._users.is_user_in_tenant(user_id, tenant_id):
            await self._tenants.bind_user(user_id, tenant_id, dept_id=dept_id)
        elif dept_id is not None:
            await self._tenants.bind_user(user_id, tenant_id, dept_id=dept_id)

        if previous_admin_id is not None and previous_admin_id != user_id:
            await self._demote_admin(previous_admin_id, tenant_id)

        await self._roles.sync_tenant_system_role_permissions(tenant_id)
        await self._assign_admin_roles(user_id, tenant_id)
        await self._tenants.set_admin_user_id(tenant_id, user_id)

    async def _assign_admin_roles(self, user_id: int, tenant_id: int) -> None:
        """赋予租户管理员角色：优先 admin，否则赋予全部绑定预置角色。"""
        admin = await self._roles.get_by_code(ROLE_ADMIN, tenant_id)
        if admin is not None:
            await self._roles.assign_role_by_code(user_id, ROLE_ADMIN, tenant_id)
            return
        codes = await TenantSystemRoleRepo(self._engine).list_role_codes(tenant_id)
        if not codes:
            raise ValueError("租户未配置预置角色，无法绑定管理员")
        for code in codes:
            await self._roles.assign_role_by_code(user_id, code, tenant_id)

    async def _demote_admin(self, user_id: int, tenant_id: int) -> None:
        """移除管理员相关角色，保留其它自定义角色。"""
        summaries = await self._roles.get_user_role_summaries(user_id, tenant_id)
        admin = await self._roles.get_by_code(ROLE_ADMIN, tenant_id)
        if admin is not None:
            role_ids = [s.id for s in summaries if s.code != ROLE_ADMIN]
        else:
            bindings = set(
                await TenantSystemRoleRepo(self._engine).list_role_codes(tenant_id)
            )
            role_ids = [s.id for s in summaries if s.code not in bindings]
        await self._roles.set_user_roles(user_id, role_ids, tenant_id)
