"""租户开发参数服务。"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_table import SYS_USER
from omni_api.data.mysql.dev_param_group_repo import DevParamGroupRepo
from omni_api.data.mysql.dev_param_repo import DevParamRepo
from omni_api.schemas.dev_param import (
    DEV_PARAM_DEFINITIONS,
    DevParamGroupDetail,
    DevParamGroupSummary,
    DevParamGroupUpdate,
    DevParamItemView,
    DevParamRecord,
    DevParamUpdate,
)

_PARAM_DEF_BY_KEY = {item[0]: item for item in DEV_PARAM_DEFINITIONS}


async def _resolve_user_display_names(
    engine: AsyncEngine, user_ids: set[int]
) -> dict[int, str]:
    if not user_ids:
        return {}
    ids = sorted(user_ids)
    placeholders = ", ".join(f":id{i}" for i in range(len(ids)))
    params = {f"id{i}": uid for i, uid in enumerate(ids)}
    sql = text(
        f"SELECT id, COALESCE(NULLIF(display_name, ''), username) "
        f"FROM {SYS_USER} WHERE id IN ({placeholders})"
    )
    async with engine.connect() as conn:
        rows = (await conn.execute(sql, params)).fetchall()
    return {int(row[0]): str(row[1]) for row in rows}


def _attach_user_names(
    summary: DevParamGroupSummary,
    names: dict[int, str],
) -> DevParamGroupSummary:
    if summary.created_by is not None:
        summary.created_by_name = names.get(summary.created_by, "")
    if summary.updated_by is not None:
        summary.updated_by_name = names.get(summary.updated_by, "")
    return summary


async def _param_views_for_group(
    groups: DevParamGroupRepo,
    group_id: int,
    records: dict[str, DevParamRecord],
    tenant_id: int,
) -> list[DevParamItemView]:
    params: list[DevParamItemView] = []
    for key, group_key, label, field_type, description in DEV_PARAM_DEFINITIONS:
        gid = await groups.get_id_for_key(group_key, tenant_id)
        if gid != group_id:
            continue
        rec = records.get(key)
        params.append(
            DevParamItemView(
                param_key=key,
                param_value=rec.param_value if rec else "",
                remark=rec.remark if rec else "",
                updated_at=rec.updated_at if rec else None,
                label=label,
                field_type=field_type,
                description=description,
                editable=True,
            )
        )
    return params


class DevParamService:
    """开发参数读写与默认值维护。"""

    def __init__(self, engine: AsyncEngine, tenant_id: int | None = None) -> None:
        self._engine = engine
        self._tenant_id = tenant_id
        self._repo = DevParamRepo(engine, tenant_id=tenant_id)
        self._groups = DevParamGroupRepo(engine, tenant_id=tenant_id)

    def _resolve_tenant(self, tenant_id: int | None) -> int:
        tid = tenant_id if tenant_id is not None else self._tenant_id
        if tid is None:
            from omni_api.data.mysql.tenant_context import get_tenant_id

            tid = get_tenant_id()
        if tid is None:
            raise ValueError("未选择租户")
        return tid

    async def list_group_summaries(
        self, tenant_id: int | None = None
    ) -> list[DevParamGroupSummary]:
        tid = self._resolve_tenant(tenant_id)
        await self._repo.ensure_defaults(tid)
        rows = await self._groups.list_with_param_count(tid)
        user_ids = {
            uid
            for group, _ in rows
            for uid in (group.created_by, group.updated_by)
            if uid is not None
        }
        names = await _resolve_user_display_names(self._engine, user_ids)
        return [
            _attach_user_names(
                DevParamGroupSummary(
                    id=group.id,
                    name=group.name,
                    description=group.description,
                    created_at=group.created_at,
                    updated_at=group.updated_at,
                    created_by=group.created_by,
                    updated_by=group.updated_by,
                    param_count=count,
                ),
                names,
            )
            for group, count in rows
        ]

    async def get_group_detail(
        self, group_id: int, tenant_id: int | None = None
    ) -> DevParamGroupDetail | None:
        tid = self._resolve_tenant(tenant_id)
        await self._repo.ensure_defaults(tid)
        group = await self._groups.get_by_id(group_id, tid)
        if group is None:
            return None
        records = {r.param_key: r for r in await self._repo.list_by_group_id(group_id, tid)}
        user_ids = {uid for uid in (group.created_by, group.updated_by) if uid is not None}
        names = await _resolve_user_display_names(self._engine, user_ids)
        params = await _param_views_for_group(self._groups, group_id, records, tid)
        summary = _attach_user_names(
            DevParamGroupSummary(
                id=group.id,
                name=group.name,
                description=group.description,
                created_at=group.created_at,
                updated_at=group.updated_at,
                created_by=group.created_by,
                updated_by=group.updated_by,
                param_count=len(params),
            ),
            names,
        )
        return DevParamGroupDetail(
            id=summary.id,
            name=summary.name,
            description=summary.description,
            created_at=summary.created_at,
            updated_at=summary.updated_at,
            created_by=summary.created_by,
            updated_by=summary.updated_by,
            created_by_name=summary.created_by_name,
            updated_by_name=summary.updated_by_name,
            param_count=summary.param_count,
            params=params,
        )

    async def get_param_item(
        self, param_key: str, tenant_id: int | None = None
    ) -> DevParamItemView | None:
        tid = self._resolve_tenant(tenant_id)
        meta = _PARAM_DEF_BY_KEY.get(param_key)
        if meta is None:
            return None
        _, group_key, _, _, _ = meta
        group_id = await self._groups.get_id_for_key(group_key, tid)
        detail = await self.get_group_detail(group_id, tid)
        if detail is None:
            return None
        return next((p for p in detail.params if p.param_key == param_key), None)

    async def update_group(
        self,
        group_id: int,
        body: DevParamGroupUpdate,
        tenant_id: int | None = None,
    ) -> DevParamGroupSummary:
        tid = self._resolve_tenant(tenant_id)
        existing = await self._groups.get_by_id(group_id, tid)
        if existing is None:
            raise ValueError("开发参数分组不存在")
        name = body.name.strip()
        if not name:
            raise ValueError("名称不能为空")
        other = await self._groups.get_by_name(name, tid)
        if other is not None and other.id != group_id:
            raise ValueError("分组名称已存在")
        group = await self._groups.update(
            group_id,
            name=name,
            description=body.description.strip(),
            tenant_id=tid,
        )
        count = len(await self._repo.list_by_group_id(group_id, tid))
        names = await _resolve_user_display_names(
            self._engine,
            {uid for uid in (group.created_by, group.updated_by) if uid is not None},
        )
        return _attach_user_names(
            DevParamGroupSummary(
                id=group.id,
                name=group.name,
                description=group.description,
                created_at=group.created_at,
                updated_at=group.updated_at,
                created_by=group.created_by,
                updated_by=group.updated_by,
                param_count=count,
            ),
            names,
        )

    async def update(
        self,
        key: str,
        body: DevParamUpdate,
        tenant_id: int | None = None,
    ) -> DevParamRecord:
        allowed = {item[0] for item in DEV_PARAM_DEFINITIONS}
        if key not in allowed:
            raise ValueError(f"不支持的开发参数: {key}")
        return await self._repo.upsert(
            key,
            body.param_value,
            body.remark,
            tenant_id=tenant_id,
        )
