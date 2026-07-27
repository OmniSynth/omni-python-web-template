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
from omni_api.schemas.oss_param import (
    DEFAULT_OSS_BASIC_PATH,
    OSS_PARAM_BASIC_PATH,
    OSS_PARAM_DOMAIN,
    effective_tenant_basic_path,
    format_oss_basic_path_display,
    validate_oss_domain,
)
from omni_api.services.dev_param_view import (
    build_param_item_view,
    resolve_param_write_value,
)
from omni_api.storage.factory import load_system_oss_params

_PARAM_DEF_BY_KEY = {item.param_key: item for item in DEV_PARAM_DEFINITIONS}


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
    engine: AsyncEngine,
    groups: DevParamGroupRepo,
    group_id: int,
    records: dict[str, DevParamRecord],
    tenant_id: int,
) -> list[DevParamItemView]:
    sys_params = await load_system_oss_params(engine)
    sys_basic = sys_params.get(OSS_PARAM_BASIC_PATH) or DEFAULT_OSS_BASIC_PATH
    tenant_basic = effective_tenant_basic_path(sys_basic, tenant_id)
    params: list[DevParamItemView] = []
    for meta in DEV_PARAM_DEFINITIONS:
        gid = await groups.get_id_for_key(meta.group_key, tenant_id)
        if gid != group_id:
            continue
        if meta.param_key == OSS_PARAM_BASIC_PATH:
            view = build_param_item_view(meta, records.get(meta.param_key), editable=False)
            view.field_type = "readonly"
            view.param_value = format_oss_basic_path_display(tenant_basic)
            view.description = "由系统基础路径与租户 ID 自动生成，不可编辑"
            view.placeholder = ""
            params.append(view)
            continue
        params.append(build_param_item_view(meta, records.get(meta.param_key)))
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
        params = await _param_views_for_group(
            self._engine, self._groups, group_id, records, tid
        )
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
        group_id = await self._groups.get_id_for_key(meta.group_key, tid)
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
        meta = _PARAM_DEF_BY_KEY.get(key)
        if meta is None:
            raise ValueError(f"不支持的开发参数: {key}")
        if key == OSS_PARAM_BASIC_PATH:
            raise ValueError("租户基础路径由系统路径与租户 ID 自动生成，不可修改")
        tid = self._resolve_tenant(tenant_id)
        existing = await self._repo.get_value(key, tid)
        value = resolve_param_write_value(meta, body.param_value, existing)
        if key == OSS_PARAM_DOMAIN:
            value = validate_oss_domain(value)
        return await self._repo.upsert(key, value, body.remark, tenant_id=tid)
