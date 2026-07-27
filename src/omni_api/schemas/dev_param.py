"""租户开发参数 DTO。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

from omni_api.schemas.oss_param import OSS_PARAM_DEFS
from omni_api.schemas.utc_datetime import UtcDateTime

DevParamFieldType = Literal["input", "password", "readonly", "role_multi_select", "select"]

TENANT_OSS_GROUP_KEY = "tenant_object_storage"


@dataclass(frozen=True, slots=True)
class DevParamDef:
    param_key: str
    group_key: str
    label: str
    field_type: DevParamFieldType
    description: str
    default_value: str = ""
    select_options: tuple[tuple[str, str], ...] = ()
    placeholder: str = ""


DEV_PARAM_GROUP_DEFINITIONS: tuple[tuple[str, str, str], ...] = (
    (TENANT_OSS_GROUP_KEY, "租户对象存储", "租户空间文件所用对象存储"),
)

DEV_PARAM_DEFINITIONS: tuple[DevParamDef, ...] = tuple(
    DevParamDef(
        item.param_key,
        TENANT_OSS_GROUP_KEY,
        item.label,
        item.field_type,
        item.description,
        item.default_value,
        item.select_options,
        item.placeholder,
    )
    for item in OSS_PARAM_DEFS
)


class DevParamGroupRecord(BaseModel):
    id: int
    name: str
    description: str = ""
    created_at: UtcDateTime | None = None
    updated_at: UtcDateTime | None = None
    created_by: int | None = None
    updated_by: int | None = None


class DevParamGroupSummary(BaseModel):
    id: int
    name: str
    description: str = ""
    created_at: UtcDateTime | None = None
    updated_at: UtcDateTime | None = None
    created_by: int | None = None
    updated_by: int | None = None
    created_by_name: str = ""
    updated_by_name: str = ""
    param_count: int = 0


class DevParamGroupUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    description: str = Field(default="", max_length=300)


class DevParamRecord(BaseModel):
    param_key: str
    group_id: int
    param_value: str
    remark: str = ""
    created_at: UtcDateTime | None = None
    updated_at: UtcDateTime | None = None


class DevParamSelectOption(BaseModel):
    value: str
    label: str


class DevParamItemView(BaseModel):
    param_key: str
    param_value: str
    remark: str = ""
    updated_at: UtcDateTime | None = None
    label: str = ""
    field_type: DevParamFieldType = "input"
    description: str = ""
    placeholder: str = ""
    editable: bool = True
    configured: bool = False
    select_options: list[DevParamSelectOption] = Field(default_factory=list)


class DevParamGroupDetail(BaseModel):
    id: int
    name: str
    description: str = ""
    created_at: UtcDateTime | None = None
    updated_at: UtcDateTime | None = None
    created_by: int | None = None
    updated_by: int | None = None
    created_by_name: str = ""
    updated_by_name: str = ""
    param_count: int = 0
    params: list[DevParamItemView]


class DevParamUpdate(BaseModel):
    param_value: str
    remark: str = ""
