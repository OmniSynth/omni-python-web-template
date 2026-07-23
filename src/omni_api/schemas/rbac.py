"""RBAC DTO。"""

from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator

from omni_api.schemas.data_scope import DEFAULT_DATA_SCOPE
from omni_api.schemas.tenant import RoleDataScopeItem
from omni_api.schemas.sys_role_type import ROLE_TYPE_TENANT, RoleType
from omni_api.schemas.utc_datetime import UtcDateTime

ROLE_CODE_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


class RoleSummary(BaseModel):
    id: int
    code: str
    name: str


class RoleRecord(BaseModel):
    id: int
    code: str
    name: str
    description: str
    role_type: RoleType = ROLE_TYPE_TENANT
    data_scope: int = DEFAULT_DATA_SCOPE
    permissions: list[str] = Field(default_factory=list)
    custom_scopes: list[RoleDataScopeItem] = Field(default_factory=list)
    system_managed: bool = False
    created_at: UtcDateTime
    updated_at: UtcDateTime


class RoleCreate(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=128)
    description: str = Field(default="", max_length=512)
    role_type: RoleType = ROLE_TYPE_TENANT
    data_scope: int = Field(default=DEFAULT_DATA_SCOPE, ge=1, le=4)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        code = value.strip()
        if not code:
            raise ValueError("角色编码必填")
        if not ROLE_CODE_RE.fullmatch(code):
            raise ValueError("角色编码仅允许字母、数字、连字符与下划线")
        return code

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("角色名称必填")
        return name


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    description: str | None = Field(default=None, max_length=512)
    data_scope: int | None = Field(default=None, ge=1, le=4)
    custom_scopes: list[RoleDataScopeItem] | None = None


class RolePermissionsPatch(BaseModel):
    permissions: list[str]


class PermissionInfo(BaseModel):
    id: int | None = None
    code: str
    name: str
    kind: str
    parent_id: int | None = None
    sort_order: int = 0
    enabled: bool = True
    route_path: str | None = None
    component_key: str | None = None
    api_codes: list[str] = Field(default_factory=list)
    children: list[PermissionInfo] = Field(default_factory=list)


class PermissionRecord(BaseModel):
    id: int
    code: str
    name: str
    kind: str
    parent_id: int | None
    sort_order: int
    enabled: bool
    route_path: str | None
    component_key: str | None
    api_method: str | None
    api_path_pattern: str | None
    description: str
    is_system: bool
    created_at: UtcDateTime
    updated_at: UtcDateTime


class PermissionCreate(BaseModel):
    code: str = Field(min_length=2, max_length=128)
    name: str = Field(min_length=1, max_length=128)
    kind: str = Field(pattern=r"^(catalog|menu|button|api)$")
    parent_id: int | None = None
    sort_order: int = 0
    enabled: bool = True
    route_path: str | None = Field(default=None, max_length=255)
    component_key: str | None = Field(default=None, max_length=64)
    api_method: str | None = Field(default=None, max_length=16)
    api_path_pattern: str | None = Field(default=None, max_length=512)
    description: str = Field(default="", max_length=512)


class PermissionUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=128)
    parent_id: int | None = None
    sort_order: int | None = None


class PermissionBindingsPatch(BaseModel):
    api_codes: list[str]
