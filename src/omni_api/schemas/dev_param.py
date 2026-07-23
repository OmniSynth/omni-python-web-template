"""租户开发参数 DTO。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from omni_api.schemas.utc_datetime import UtcDateTime

DevParamFieldType = Literal["input", "password", "readonly", "role_multi_select"]

# 内置分组与参数定义（可按业务扩展）
DEV_PARAM_GROUP_DEFINITIONS: tuple[tuple[str, str, str], ...] = ()

DEV_PARAM_DEFINITIONS: tuple[tuple[str, str, str, DevParamFieldType, str], ...] = ()


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


class DevParamItemView(BaseModel):
    param_key: str
    param_value: str
    remark: str = ""
    updated_at: UtcDateTime | None = None
    label: str = ""
    field_type: DevParamFieldType = "input"
    description: str = ""
    editable: bool = True


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


class DevParamDefinition(BaseModel):
    param_key: str
    group_id: int
    label: str
    field_type: DevParamFieldType
    description: str
    param_value: str = ""
    remark: str = ""


class DevParamUpdate(BaseModel):
    param_value: str
    remark: str = ""
