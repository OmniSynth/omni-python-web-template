"""机构管理 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from omni_api.api.deps import require_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.org_repo import OrgRepo
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.list_query import SortOrder
from omni_api.schemas.tenant import (
    OrganizationCreate,
    OrganizationCreateResult,
    OrganizationRecord,
    OrganizationUpdate,
)
from omni_api.services.org_onboarding import OrgOnboardingService

router = APIRouter(prefix="/api/v1/orgs", tags=["orgs"])


@router.get("", response_model=list[OrganizationRecord])
async def list_orgs(
    sort_by: str | None = Query(default=None),
    sort_order: SortOrder | None = Query(default=None),
    _: UserRecord = Depends(require_permission("system.org.list")),
) -> list[OrganizationRecord]:
    return await OrgRepo(mysql_engine()).list_orgs(
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.post("", response_model=OrganizationCreateResult)
async def create_org(
    body: OrganizationCreate,
    _: UserRecord = Depends(require_permission("system.org.create")),
) -> OrganizationCreateResult:
    try:
        return await OrgOnboardingService(mysql_engine()).create_with_tenant(body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/{org_id}", response_model=OrganizationRecord)
async def update_org(
    org_id: int,
    body: OrganizationUpdate,
    _: UserRecord = Depends(require_permission("system.org.update")),
) -> OrganizationRecord:
    try:
        org = await OrgRepo(mysql_engine()).update(org_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if org is None:
        raise HTTPException(status_code=404, detail="机构不存在")
    return org
