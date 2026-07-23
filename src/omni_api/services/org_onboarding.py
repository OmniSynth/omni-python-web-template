"""机构创建并联动开通租户。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.org_repo import OrgRepo
from omni_api.schemas.tenant import (
    OrganizationCreate,
    OrganizationCreateResult,
    TenantCreate,
)
from omni_api.services.phone import normalize_phone
from omni_api.services.tenant_onboarding import TenantOnboardingService


class OrgOnboardingService:
    """创建机构并自动开通关联租户。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._orgs = OrgRepo(engine)
        self._tenant_onboarding = TenantOnboardingService(engine)

    async def create_with_tenant(
        self,
        body: OrganizationCreate,
        *,
        admin_password: str | None = None,
    ) -> OrganizationCreateResult:
        org = await self._orgs.create_basic(
            name=body.name,
            org_type=body.org_type,
            credit_code=body.credit_code,
            phone=body.phone,
            enabled=body.enabled,
        )
        tenant_body = TenantCreate(
            name=body.name,
            province=body.province,
            city=body.city,
            district=body.district,
            region=body.region,
            org_id=org.id,
            phone=normalize_phone(body.phone),
            admin_user_id=body.admin_user_id,
            system_role_codes=body.system_role_codes,
            enabled=body.enabled,
        )
        onboard = await self._tenant_onboarding.onboard_from_create(
            tenant_body,
            admin_password=admin_password,
        )
        return OrganizationCreateResult(
            organization=org,
            tenant=onboard.tenant,
            dept=onboard.dept,
            admin_credentials=onboard.admin_credentials,
        )
