"""用户与认证 DTO。"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from omni_api.schemas.data_scope import DEFAULT_DATA_SCOPE
from omni_api.schemas.rbac import RoleSummary
from omni_api.schemas.tenant import OrgType, ProvisionCredentials, RoleDataScopeItem
from omni_api.schemas.utc_datetime import UtcDateTime


class UserRecord(BaseModel):
    """用户记录（不含密码）。"""

    id: int
    username: str
    display_name: str
    enabled: bool
    roles: list[RoleSummary] = Field(default_factory=list)
    dept_id: int | None = None
    data_scope: int | None = None
    custom_scopes: list[RoleDataScopeItem] = Field(default_factory=list)
    membership_status: int | None = None
    created_at: UtcDateTime
    updated_at: UtcDateTime
    created_by: int | None = None
    updated_by: int | None = None


class AuthUser(BaseModel):
    """登录后会话中的用户摘要。"""

    id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    roles: list[str]
    permissions: list[str]
    tenant_id: int | None = None
    dept_id: int | None = None
    need_tenant_select: bool = False


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class LoginResponse(BaseModel):
    session_token: str
    token_type: str = "session"
    user: AuthUser
    need_tenant_select: bool = False


class RegisterRequest(BaseModel):
    """公开注册：填写机构信息并开通租户；手机号作为管理员登录账号，密码由系统生成。"""

    name: str = Field(min_length=1, max_length=128, description="机构名称")
    org_type: OrgType = Field(description="机构类型")
    credit_code: str = Field(min_length=1, max_length=18, description="18 位统一社会信用代码")
    phone: str = Field(min_length=11, max_length=20, description="机构联系电话，作为登录账号")
    province: str = Field(min_length=1, max_length=64)
    city: str = Field(min_length=1, max_length=64)
    district: str = Field(min_length=1, max_length=64)
    region: str = Field(min_length=2, max_length=16, description="区县行政区划码")


class RegisterResponse(LoginResponse):
    """注册成功：会话 + 一次性管理员凭据。"""

    admin_credentials: ProvisionCredentials


class SwitchTenantRequest(BaseModel):
    tenant_id: int = Field(gt=0)


class UserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=128)
    role_ids: list[int] = Field(default_factory=list)
    dept_id: int | None = None
    data_scope: int = Field(default=DEFAULT_DATA_SCOPE, ge=1, le=4)
    custom_scopes: list[RoleDataScopeItem] = Field(default_factory=list)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("用户名必填")
        return name

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("显示名必填")
        return name


class TenantUserCreate(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=128)
    role_ids: list[int] = Field(default_factory=list)
    dept_id: int = Field(gt=0, description="所属部门，必填")
    data_scope: int = Field(default=DEFAULT_DATA_SCOPE, ge=1, le=4)
    custom_scopes: list[RoleDataScopeItem] = Field(default_factory=list)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("用户名必填")
        return name

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("显示名必填")
        return name


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=128)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    enabled: bool | None = None
    role_ids: list[int] | None = None
    dept_id: int | None = None
    data_scope: int | None = Field(default=None, ge=1, le=4)
    custom_scopes: list[RoleDataScopeItem] | None = None


class TenantUserUpdate(BaseModel):
    """租户管理员编辑用户：不含显示名。"""

    enabled: bool | None = None
    role_ids: list[int] | None = None
    dept_id: int | None = None
    data_scope: int | None = Field(default=None, ge=1, le=4)
    custom_scopes: list[RoleDataScopeItem] | None = None


class UserEnabledPatch(BaseModel):
    enabled: bool


class UserPasswordResetResponse(BaseModel):
    """重置密码后一次性返回明文。"""

    username: str
    password: str


class UserCreateWithPassword(BaseModel):
    """创建用户后一次性返回明文密码；绑定已有用户时 password 为 null。"""

    user: UserRecord
    password: str | None = None
    bound_existing: bool = False
