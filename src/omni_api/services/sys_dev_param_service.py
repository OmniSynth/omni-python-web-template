"""系统开发参数服务。"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.biz_table import SYS_USER
from omni_api.data.mysql.sys_dev_param_group_repo import SysDevParamGroupRepo
from omni_api.data.mysql.sys_dev_param_repo import SysDevParamRepo
from omni_api.data.mysql.sys_schema import ensure_sys_schema
from omni_api.schemas.dev_param import (
    DevParamGroupDetail,
    DevParamGroupSummary,
    DevParamGroupUpdate,
    DevParamItemView,
    DevParamRecord,
    DevParamUpdate,
)
from omni_api.schemas.oss_param import (
    OSS_PARAM_BASIC_PATH,
    OSS_PARAM_DOMAIN,
    format_oss_basic_path_display,
    normalize_oss_basic_path,
    validate_oss_domain,
)
from omni_api.schemas.sys_dev_param import SYS_DEV_PARAM_DEFINITIONS
from omni_api.services.dev_param_view import (
    build_param_item_view,
    resolve_param_write_value,
)

_PARAM_DEF_BY_KEY = {item.param_key: item for item in SYS_DEV_PARAM_DEFINITIONS}


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


class SysDevParamService:
    """系统开发参数读写。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._repo = SysDevParamRepo(engine)
        self._groups = SysDevParamGroupRepo(engine)

    async def _ready(self) -> None:
        await ensure_sys_schema(self._engine)
        await self._repo.ensure_defaults()

    async def list_group_summaries(self) -> list[DevParamGroupSummary]:
        await self._ready()
        rows = await self._groups.list_with_param_count()
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

    async def get_group_detail(self, group_id: int) -> DevParamGroupDetail | None:
        await self._ready()
        group = await self._groups.get_by_id(group_id)
        if group is None:
            return None
        records = {r.param_key: r for r in await self._repo.list_by_group_id(group_id)}
        user_ids = {uid for uid in (group.created_by, group.updated_by) if uid is not None}
        names = await _resolve_user_display_names(self._engine, user_ids)
        group_ids: dict[str, int] = {}
        for meta in SYS_DEV_PARAM_DEFINITIONS:
            if meta.group_key not in group_ids:
                group_ids[meta.group_key] = await self._groups.get_id_for_key(meta.group_key)
        params: list[DevParamItemView] = []
        for meta in SYS_DEV_PARAM_DEFINITIONS:
            if group_ids[meta.group_key] != group_id:
                continue
            view = build_param_item_view(meta, records.get(meta.param_key))
            if meta.param_key == OSS_PARAM_BASIC_PATH:
                raw = view.param_value.strip() or meta.default_value
                view.param_value = format_oss_basic_path_display(raw)
            params.append(view)
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

    async def get_param_item(self, param_key: str) -> DevParamItemView | None:
        meta = _PARAM_DEF_BY_KEY.get(param_key)
        if meta is None:
            return None
        await self._ready()
        group_id = await self._groups.get_id_for_key(meta.group_key)
        detail = await self.get_group_detail(group_id)
        if detail is None:
            return None
        return next((p for p in detail.params if p.param_key == param_key), None)

    async def update_group(
        self, group_id: int, body: DevParamGroupUpdate
    ) -> DevParamGroupSummary:
        await self._ready()
        existing = await self._groups.get_by_id(group_id)
        if existing is None:
            raise ValueError("系统开发参数分组不存在")
        name = body.name.strip()
        if not name:
            raise ValueError("名称不能为空")
        other = await self._groups.get_by_name(name)
        if other is not None and other.id != group_id:
            raise ValueError("分组名称已存在")
        group = await self._groups.update(
            group_id, name=name, description=body.description.strip()
        )
        count = len(await self._repo.list_by_group_id(group_id))
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

    async def update(self, key: str, body: DevParamUpdate) -> DevParamRecord:
        meta = _PARAM_DEF_BY_KEY.get(key)
        if meta is None:
            raise ValueError(f"不支持的系统开发参数: {key}")
        await self._ready()
        existing = await self._repo.get_value(key)
        value = resolve_param_write_value(meta, body.param_value, existing)
        if key == OSS_PARAM_DOMAIN:
            value = validate_oss_domain(value)
        elif key == OSS_PARAM_BASIC_PATH:
            value = normalize_oss_basic_path(value) or value.strip()
            if not value:
                raise ValueError("基础路径不能为空")
        return await self._repo.upsert(key, value, body.remark)
