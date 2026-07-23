"""用户表格偏好 API。"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from omni_api.api.deps import get_current_user
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.table_preference_repo import TablePreferenceRepo
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.table_preference import (
    TablePreferenceConfig,
    TablePreferenceGetResponse,
    TablePreferenceRecord,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/users/me/table-preferences",
    tags=["table-preferences"],
    dependencies=[Depends(get_current_user)],
)


def _repo() -> TablePreferenceRepo:
    return TablePreferenceRepo(mysql_engine())


@router.get(
    "/{page_key}/{table_key}",
    response_model=TablePreferenceGetResponse,
    response_model_by_alias=True,
)
async def get_table_preference(
    page_key: str,
    table_key: str,
    user: UserRecord = Depends(get_current_user),
) -> TablePreferenceGetResponse:
    record = await _repo().get(user.id, page_key, table_key)
    if record is None:
        return TablePreferenceGetResponse(page_key=page_key, table_key=table_key)
    return TablePreferenceGetResponse(
        page_key=record.page_key,
        table_key=record.table_key,
        config=record.config,
        updated_at=record.updated_at,
    )


@router.put(
    "/{page_key}/{table_key}",
    response_model=TablePreferenceRecord,
    response_model_by_alias=True,
)
async def save_table_preference(
    page_key: str,
    table_key: str,
    body: TablePreferenceConfig,
    user: UserRecord = Depends(get_current_user),
) -> TablePreferenceRecord:
    return await _repo().upsert(
        user.id,
        page_key,
        table_key,
        body,
        actor_id=user.id,
    )


@router.delete("/{page_key}/{table_key}")
async def reset_table_preference(
    page_key: str,
    table_key: str,
    user: UserRecord = Depends(get_current_user),
) -> dict[str, str]:
    deleted = await _repo().delete(user.id, page_key, table_key)
    if not deleted:
        raise HTTPException(status_code=404, detail="表格偏好不存在")
    return {"status": "ok"}
