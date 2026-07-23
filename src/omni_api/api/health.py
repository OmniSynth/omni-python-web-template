"""健康检查。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
