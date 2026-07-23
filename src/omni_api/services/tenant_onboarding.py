"""租户开通编排：分表、角色、部门、管理员账号。"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.dept_repo import DeptRepo
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.tenant_system_role_repo import TenantSystemRoleRepo
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.schemas.auth import UserCreate
from omni_api.schemas.tenant import (
    DeptCreate,
    DeptRecord,
    ProvisionCredentials,
    TenantCreate,
    TenantCreateResult,
    TenantRecord,
)
from omni_api.services.auth_credentials import hash_password
from omni_api.services.random_password import generate_random_password
from omni_api.services.tenant_admin import TenantAdminService


@dataclass(frozen=True, slots=True)
class TenantOnboardResult:
    tenant: TenantRecord
    dept: DeptRecord
    admin_credentials: ProvisionCredentials | None


class TenantOnboardingService:
    """租户创建后的完整开通流程。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._tenants = TenantRepo(engine)
        self._roles = RoleRepo(engine)
        self._system_roles = TenantSystemRoleRepo(engine)
        self._depts = DeptRepo(engine)
        self._users = UserRepo(engine)
        self._admin = TenantAdminService(engine)

    async def onboard_from_create(self, body: TenantCreate) -> TenantOnboardResult:
        tenant = await self._tenants.create(body)
        return await self._finish_onboarding(
            tenant=tenant,
            system_role_codes=body.system_role_codes,
            dept_name=body.name,
            admin_user_id=body.admin_user_id,
        )

    async def _finish_onboarding(
        self,
        *,
        tenant: TenantRecord,
        system_role_codes: list[str],
        dept_name: str,
        admin_user_id: int | None,
    ) -> TenantOnboardResult:
        tenant_id = tenant.id
        await self._system_roles.ensure_schema()
        await self._system_roles.set_bindings(tenant_id, system_role_codes)
        await self._roles.ensure_preset_roles(tenant_id, system_role_codes)
        await self._roles.sync_tenant_system_role_permissions(
            tenant_id, previous_bindings=[]
        )
        dept = await self._depts.create(
            tenant_id,
            DeptCreate(parent_id=0, name=dept_name, sort_order=0, enabled=True),
        )
        credentials = await self._provision_admin(
            tenant_id=tenant_id,
            tenant=tenant,
            dept_id=dept.id,
            admin_user_id=admin_user_id,
        )
        refreshed = await self._tenants.get_by_id(tenant_id)
        if refreshed is None:
            raise RuntimeError(f"开通后租户不存在: {tenant_id}")
        return TenantOnboardResult(
            tenant=refreshed,
            dept=dept,
            admin_credentials=credentials,
        )

    async def _provision_admin(
        self,
        *,
        tenant_id: int,
        tenant: TenantRecord,
        dept_id: int,
        admin_user_id: int | None,
    ) -> ProvisionCredentials | None:
        """开通租户管理员：手动指定 > 手机号匹配已有用户 > 新建用户。"""
        if admin_user_id is not None:
            await self._admin.bind_admin(tenant_id, admin_user_id, dept_id=dept_id)
            return None

        existing = await self._users.get_by_username(tenant.phone)
        if existing is not None:
            user, _ = existing
            if not user.enabled:
                raise ValueError("租户手机号对应用户已禁用，无法绑定为管理员")
            await self._admin.bind_admin(tenant_id, user.id, dept_id=dept_id)
            return None

        password = generate_random_password()
        user = await self._users.create_user(
            UserCreate(
                username=tenant.phone,
                password=password,
                display_name="管理员",
                role_ids=[],
                dept_id=dept_id,
            ),
            hash_password(password),
            tenant_id=tenant_id,
            dept_id=dept_id,
        )
        await self._admin.bind_admin(tenant_id, user.id, dept_id=dept_id)
        return ProvisionCredentials(username=tenant.phone, password=password)

    async def create_with_result(self, body: TenantCreate) -> TenantCreateResult:
        result = await self.onboard_from_create(body)
        return TenantCreateResult(
            tenant=result.tenant,
            dept=result.dept,
            admin_credentials=result.admin_credentials,
        )
