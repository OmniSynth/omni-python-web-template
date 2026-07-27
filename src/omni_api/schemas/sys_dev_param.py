"""系统开发参数定义与 DTO（复用租户开发参数展示模型）。"""

from __future__ import annotations

from omni_api.schemas.dev_param import (
    DevParamDef,
    DevParamGroupDetail,
    DevParamGroupRecord,
    DevParamGroupSummary,
    DevParamGroupUpdate,
    DevParamItemView,
    DevParamRecord,
    DevParamUpdate,
)
from omni_api.schemas.oss_param import OSS_PARAM_DEFS

SYS_OSS_GROUP_KEY = "sys_object_storage"

SYS_DEV_PARAM_GROUP_DEFINITIONS: tuple[tuple[str, str, str], ...] = (
    (SYS_OSS_GROUP_KEY, "系统对象存储", "系统级文件（如头像）所用对象存储"),
)

SYS_DEV_PARAM_DEFINITIONS: tuple[DevParamDef, ...] = tuple(
    DevParamDef(
        item.param_key,
        SYS_OSS_GROUP_KEY,
        item.label,
        item.field_type,
        item.description,
        item.default_value,
        item.select_options,
        item.placeholder,
    )
    for item in OSS_PARAM_DEFS
)

__all__ = [
    "SYS_DEV_PARAM_DEFINITIONS",
    "SYS_DEV_PARAM_GROUP_DEFINITIONS",
    "SYS_OSS_GROUP_KEY",
    "DevParamDef",
    "DevParamGroupDetail",
    "DevParamGroupRecord",
    "DevParamGroupSummary",
    "DevParamGroupUpdate",
    "DevParamItemView",
    "DevParamRecord",
    "DevParamUpdate",
]
