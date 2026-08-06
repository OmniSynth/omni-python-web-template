"""导出任务（下载中心）DTO。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from omni_api.schemas.utc_datetime import UtcDateTime

ExportJobStatus = Literal["queued", "running", "done", "failed"]


class ExportJobCreateResult(BaseModel):
    job_id: int
    message: str = "已加入下载中心"


class ExportJobBadge(BaseModel):
    """顶栏角标：进行中（蓝）与已完成未读（绿）；展示时绿优先。"""

    active_count: int = 0
    done_unread_count: int = 0


class ExportJobMarkReadResult(BaseModel):
    marked: int = 0


class ExportJobRecord(BaseModel):
    id: int
    source_type: str
    source_label: str = ""
    status: ExportJobStatus
    progress_current: int = 0
    progress_total: int = 0
    filename: str = ""
    content_type: str = ""
    file_size: int = 0
    row_count: int = 0
    error_message: str = ""
    public_url: str = ""
    expires_at: UtcDateTime | None = None
    read_at: UtcDateTime | None = None
    created_at: UtcDateTime | None = None
    updated_at: UtcDateTime | None = None


class PaginatedExportJob(BaseModel):
    items: list[ExportJobRecord]
    total: int
    page: int
    page_size: int
