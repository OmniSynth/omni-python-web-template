"""开发参数 API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from omni_api.api.deps_tenant import current_tenant_id, require_tenant_permission
from omni_api.data.mysql.connection import mysql_engine
from omni_api.schemas.auth import UserRecord
from omni_api.schemas.dev_param import (
    DevParamGroupDetail,
    DevParamGroupSummary,
    DevParamGroupUpdate,
    DevParamRecord,
    DevParamUpdate,
)
from omni_api.services.audit_service import AuditService
from omni_api.services.dev_param_service import DevParamService
from omni_api.services.dev_param_view import redact_param_for_audit

router = APIRouter(
    prefix="/api/v1/dev-params",
    tags=["dev-params"],
    dependencies=[Depends(require_tenant_permission("dev_param.list"))],
)


def _svc(tenant_id: int) -> DevParamService:
    return DevParamService(mysql_engine(), tenant_id=tenant_id)


@router.get("/groups", response_model=list[DevParamGroupSummary])
async def list_groups(tenant_id: int = Depends(current_tenant_id)) -> list[DevParamGroupSummary]:
    return await _svc(tenant_id).list_group_summaries(tenant_id)


@router.get("/groups/{group_id}", response_model=DevParamGroupDetail)
async def get_group(
    group_id: int, tenant_id: int = Depends(current_tenant_id)
) -> DevParamGroupDetail:
    detail = await _svc(tenant_id).get_group_detail(group_id, tenant_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="开发参数分组不存在")
    return detail


@router.put("/groups/{group_id}", response_model=DevParamGroupSummary)
async def update_group(
    group_id: int,
    body: DevParamGroupUpdate,
    tenant_id: int = Depends(current_tenant_id),
    actor: UserRecord = Depends(require_tenant_permission("dev_param.update")),
) -> DevParamGroupSummary:
    svc = _svc(tenant_id)
    before = await svc.get_group_detail(group_id, tenant_id)
    try:
        after = await svc.update_group(group_id, body, tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await AuditService().record_operation(
        category="dev_param",
        action="update_group",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="dev_param_group",
        resource_id=str(group_id),
        before=before.model_dump() if before else None,
        after=after.model_dump(),
        name=after.name,
    )
    return after


@router.put("/{param_key}", response_model=DevParamRecord)
async def update_param(
    param_key: str,
    body: DevParamUpdate,
    tenant_id: int = Depends(current_tenant_id),
    actor: UserRecord = Depends(require_tenant_permission("dev_param.update")),
) -> DevParamRecord:
    svc = _svc(tenant_id)
    before = await svc.get_param_item(param_key, tenant_id)
    try:
        after = await svc.update(param_key, body, tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await AuditService().record_operation(
        category="dev_param",
        action="update",
        level="business",
        actor_id=actor.id,
        actor_username=actor.username,
        resource_type="dev_param",
        resource_id=param_key,
        before=redact_param_for_audit(param_key, before),
        after=redact_param_for_audit(param_key, after),
        name=param_key,
    )
    return after
