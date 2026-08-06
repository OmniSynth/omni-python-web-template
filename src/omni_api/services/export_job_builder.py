"""导出任务产物与可插拔构建器。"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Protocol

from sqlalchemy.ext.asyncio import AsyncEngine

XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

ProgressCallback = Callable[[int, int], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class ExportFile:
    filename: str
    content: bytes
    content_type: str = XLSX_CONTENT_TYPE
    row_count: int = 0


class ExportBuilder(Protocol):
    async def __call__(
        self,
        *,
        engine: AsyncEngine,
        tenant_id: int,
        filename: str,
        filter_payload: dict[str, Any],
        on_progress: ProgressCallback,
    ) -> ExportFile: ...


_BUILDERS: dict[str, ExportBuilder] = {}


def register_export_builder(source_type: str, builder: ExportBuilder) -> None:
    """业务域注册导出构建器（如短剧列表、报表）。"""
    _BUILDERS[source_type] = builder


def get_export_builder(source_type: str) -> ExportBuilder | None:
    return _BUILDERS.get(source_type)
