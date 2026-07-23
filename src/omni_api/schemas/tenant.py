"""机构、租户、部门 DTO。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from omni_api.schemas.data_scope import DEFAULT_DATA_SCOPE
from omni_api.schemas.utc_datetime import UtcDateTime

OrgType = Literal["company", "government", "school", "hospital", "association"]
DataScopeType = Literal[1, 2, 3, 4]
ScopeItemType = Literal["dept", "user"]

MEMBERSHIP_ACTIVE = 1
MEMBERSHIP_DEPARTED = 2


class OrganizationRecord(BaseModel):
    id: int
    name: str
    org_type: OrgType
    credit_code: str
    phone: str = ""
    enabled: bool
    created_at: UtcDateTime
    updated_at: UtcDateTime


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    org_type: OrgType = "company"
    credit_code: str = Field(min_length=1, max_length=18, description="18 位统一社会信用代码，必填")
    phone: str = Field(min_length=11, max_length=20, description="机构联系电话，全局唯一；租户同步使用")
    province: str = Field(min_length=1, max_length=64)
    city: str = Field(min_length=1, max_length=64)
    district: str = Field(min_length=1, max_length=64)
    region: str = Field(min_length=2, max_length=16, description="区县行政区划码，用于租户编码")
    admin_user_id: int | None = Field(
        default=None,
        gt=0,
        description="手动指定租户管理员；为空则按机构手机号匹配已有用户或自动创建",
    )
    system_role_codes: list[str] = Field(
        default_factory=lambda: ["operator", "viewer"],
        description="租户绑定的预置系统角色",
    )
    enabled: bool = True


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    org_type: OrgType | None = None
    credit_code: str | None = Field(default=None, max_length=18)
    phone: str | None = Field(default=None, max_length=20)
    enabled: bool | None = None


class TenantRecord(BaseModel):
    id: int
    code: str
    name: str
    province: str
    city: str
    district: str
    region: str
    phone: str = ""
    admin_user_id: int | None = None
    admin_username: str | None = None
    admin_display_name: str | None = None
    enabled: bool
    created_at: UtcDateTime
    updated_at: UtcDateTime


class TenantAdminUserOption(BaseModel):
    """租户管理员候选用户。"""

    id: int
    username: str
    display_name: str
    bound: bool = False


class TenantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    province: str = Field(min_length=1, max_length=64)
    city: str = Field(min_length=1, max_length=64)
    district: str = Field(min_length=1, max_length=64)
    region: str = Field(min_length=2, max_length=16, description="区县行政区划码，用于租户编码")
    org_id: int = Field(description="所属机构，用于确定行业前缀")
    phone: str = Field(min_length=11, max_length=20, description="租户联系电话，可重复")
    admin_user_id: int | None = Field(
        default=None,
        gt=0,
        description="手动指定租户管理员；为空则按机构手机号匹配已有用户或自动创建",
    )
    system_role_codes: list[str] = Field(
        default_factory=lambda: ["operator", "viewer"],
        description="绑定的预置系统角色",
    )
    enabled: bool = True


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    province: str | None = Field(default=None, max_length=64)
    city: str | None = Field(default=None, max_length=64)
    district: str | None = Field(default=None, max_length=64)
    region: str | None = Field(default=None, min_length=2, max_length=16)
    phone: str | None = Field(default=None, max_length=20)
    admin_user_id: int | None = Field(default=None, gt=0, description="更换租户管理员")
    enabled: bool | None = None


class ProvisionCredentials(BaseModel):
    """开通后一次性返回的管理员凭据。"""

    username: str
    password: str


class OrganizationCreateResult(BaseModel):
    organization: OrganizationRecord
    tenant: TenantRecord
    dept: DeptRecord
    admin_credentials: ProvisionCredentials | None = None


class TenantCreateResult(BaseModel):
    tenant: TenantRecord
    dept: DeptRecord
    admin_credentials: ProvisionCredentials | None = None


class TenantSystemRolesUpdate(BaseModel):
    role_codes: list[str] = Field(min_length=1)


class TenantSystemRolesRecord(BaseModel):
    tenant_id: int
    role_codes: list[str] = Field(default_factory=list)


class DeptRecord(BaseModel):
    id: int
    parent_id: int
    name: str
    sort_order: int
    enabled: bool
    children: list[DeptRecord] = Field(default_factory=list)


class DeptCreate(BaseModel):
    parent_id: int = 0
    name: str = Field(min_length=1, max_length=128)
    sort_order: int = 0
    enabled: bool = True


class DeptUpdate(BaseModel):
    parent_id: int | None = None
    name: str | None = Field(default=None, max_length=128)
    sort_order: int | None = None
    enabled: bool | None = None


class BoundTenantInfo(BaseModel):
    id: int
    name: str
    code: str = ""
    province: str = ""
    city: str = ""
    district: str = ""
    org_name: str = ""
    org_credit_code: str = ""
    dept_id: int | None = None
    dept_name: str | None = None


class UserTenantBinding(BaseModel):
    user_id: int
    tenant_id: int
    dept_id: int | None = None
    data_scope: int = DEFAULT_DATA_SCOPE
    custom_scopes: list[RoleDataScopeItem] = Field(default_factory=list)
    last_login_at: UtcDateTime | None = None
    membership_status: int = MEMBERSHIP_ACTIVE


class UserTenantConfigItem(BaseModel):
    """用户租户绑定配置（含未绑定租户）。"""

    tenant_id: int
    tenant_name: str
    tenant_code: str = ""
    province: str = ""
    city: str = ""
    district: str = ""
    org_name: str = ""
    org_credit_code: str = ""
    tenant_enabled: bool
    bound: bool
    dept_id: int | None = None
    dept_name: str | None = None
    data_scope: int = DEFAULT_DATA_SCOPE
    custom_scopes: list[RoleDataScopeItem] = Field(default_factory=list)


class UserTenantBindingInput(BaseModel):
    tenant_id: int = Field(gt=0)
    dept_id: int = Field(gt=0, description="租户内部门，必填")
    data_scope: int = Field(default=DEFAULT_DATA_SCOPE, ge=1, le=4)
    custom_scopes: list[RoleDataScopeItem] = Field(default_factory=list)


class UserTenantsUpdate(BaseModel):
    bindings: list[UserTenantBindingInput] = Field(min_length=1)


class RoleDataScopeItem(BaseModel):
    scope_type: ScopeItemType
    scope_id: int
