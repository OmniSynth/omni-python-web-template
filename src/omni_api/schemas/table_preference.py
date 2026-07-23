"""用户表格偏好 DTO。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from omni_api.schemas.utc_datetime import UtcDateTime


class TableColumnPreference(BaseModel):
    """单列偏好。"""

    visible: bool = True
    pinned: bool = False
    width: int | None = None
    label: str | None = None
    tip: str | None = None
    order: int = 0
    action_order: list[str] | None = Field(
        default=None,
        validation_alias="actionOrder",
        serialization_alias="actionOrder",
    )


class TableSortPreference(BaseModel):
    """表格排序偏好（API JSON 使用 camelCase columnId）。"""

    model_config = ConfigDict(serialize_by_alias=True)

    column_id: str = Field(
        min_length=1,
        max_length=64,
        validation_alias="columnId",
        serialization_alias="columnId",
    )
    order: Literal["asc", "desc"] = "asc"


class TablePreferenceConfig(BaseModel):
    """表格偏好配置 JSON。"""

    model_config = ConfigDict(serialize_by_alias=True)

    version: Literal[1] = 1
    row_height: int = Field(
        default=36,
        ge=24,
        le=120,
        validation_alias="rowHeight",
        serialization_alias="rowHeight",
    )
    sort: TableSortPreference | None = None
    columns: dict[str, TableColumnPreference] = Field(default_factory=dict)


class TablePreferenceRecord(BaseModel):
    """API 返回的偏好记录。"""

    page_key: str
    table_key: str
    config: TablePreferenceConfig
    updated_at: UtcDateTime


class TablePreferenceGetResponse(BaseModel):
    """GET 响应：无记录时 config 为 null，仍返回 200。"""

    page_key: str
    table_key: str
    config: TablePreferenceConfig | None = None
    updated_at: UtcDateTime | None = None
