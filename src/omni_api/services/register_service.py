"""公开注册：创建机构并开通租户，随后登录。"""

from __future__ import annotations

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.schemas.auth import LoginRequest, RegisterRequest, RegisterResponse
from omni_api.schemas.tenant import OrganizationCreate
from omni_api.services.org_onboarding import OrgOnboardingService
from omni_api.services.phone import normalize_phone
from omni_api.services.session_service import SessionService


class RegisterService:
    """匿名注册并开通租户管理员会话。"""

    def __init__(self) -> None:
        self._engine = mysql_engine()
        self._users = UserRepo(self._engine)
        self._org_onboarding = OrgOnboardingService(self._engine)
        self._sessions = SessionService()

    async def register(self, body: RegisterRequest) -> RegisterResponse:
        phone = normalize_phone(body.phone)
        existing = await self._users.get_by_username(phone)
        if existing is not None:
            raise ValueError("该手机号已注册")

        org_body = OrganizationCreate(
            name=body.name.strip(),
            org_type=body.org_type,
            credit_code=body.credit_code,
            phone=phone,
            province=body.province.strip(),
            city=body.city.strip(),
            district=body.district.strip(),
            region=body.region.strip(),
            admin_user_id=None,
            enabled=True,
        )
        onboard = await self._org_onboarding.create_with_tenant(org_body)
        credentials = onboard.admin_credentials
        if credentials is None:
            raise ValueError("注册失败：未能创建管理员账号")

        login = await self._sessions.login(
            LoginRequest(username=credentials.username, password=credentials.password)
        )
        return RegisterResponse(
            session_token=login.session_token,
            token_type=login.token_type,
            user=login.user,
            need_tenant_select=login.need_tenant_select,
            admin_credentials=credentials,
        )
