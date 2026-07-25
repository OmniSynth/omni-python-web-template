"""权限种子同步。"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.auth.permission_seed import API_ROUTE_SEEDS, PERMISSION_SEEDS
from omni_api.data.mysql.audit import audit_insert_params, audit_update_params
from omni_api.data.mysql.biz_table import (
    SYS_PERMISSION_API_BINDINGS,
    SYS_PERMISSION_API_ROUTES,
    SYS_PERMISSIONS,
)

_P = SYS_PERMISSIONS
_B = SYS_PERMISSION_API_BINDINGS
_R = SYS_PERMISSION_API_ROUTES

logger = logging.getLogger(__name__)


def _parent_sort_key(parent_id: int | None) -> str:
    return str(parent_id) if parent_id is not None else "__root__"


def next_append_sort_order(
    max_by_parent: dict[str, int],
    parent_id: int | None,
) -> int:
    """同级下一个追加排序值（从 0 起，追加到末尾）。"""
    key = _parent_sort_key(parent_id)
    next_val = max_by_parent.get(key, -1) + 1
    max_by_parent[key] = next_val
    return next_val


async def _load_max_sort_by_parent(engine: AsyncEngine) -> dict[str, int]:
    sql = text(f"SELECT parent_id, MAX(sort_order) FROM {_P} GROUP BY parent_id")
    async with engine.connect() as conn:
        rows = (await conn.execute(sql)).fetchall()
    result: dict[str, int] = {}
    for row in rows:
        parent_id = row[0]
        max_sort = int(row[1]) if row[1] is not None else -1
        result[_parent_sort_key(parent_id)] = max_sort
    return result


async def existing_codes(engine: AsyncEngine) -> set[str]:
    sql = text(f"SELECT code FROM {_P}")
    async with engine.connect() as conn:
        rows = (await conn.execute(sql)).fetchall()
    return {str(r[0]) for r in rows}


async def code_to_id(engine: AsyncEngine) -> dict[str, int]:
    sql = text(f"SELECT id, code FROM {_P}")
    async with engine.connect() as conn:
        rows = (await conn.execute(sql)).fetchall()
    return {str(r[1]): int(r[0]) for r in rows}


async def insert_seed_batch(engine: AsyncEngine, seeds: tuple) -> None:
    mapping = await code_to_id(engine)
    max_by_parent = await _load_max_sort_by_parent(engine)
    insert_sql = text(
        f"INSERT INTO {_P} "
        "(code, name, kind, parent_id, sort_order, enabled, route_path, "
        "component_key, description, is_system, created_by, updated_by) "
        "VALUES (:code, :name, :kind, :parent_id, :sort_order, 1, "
        ":route_path, :component_key, :description, 1, :created_by, :updated_by)"
    )
    audit = audit_insert_params()
    async with engine.begin() as conn:
        for seed in seeds:
            if seed.code in mapping:
                continue
            parent_id = mapping.get(seed.parent) if seed.parent else None
            if seed.kind == "catalog":
                sort_order = seed.sort_order
                key = _parent_sort_key(parent_id)
                max_by_parent[key] = max(max_by_parent.get(key, -1), sort_order)
            else:
                sort_order = next_append_sort_order(max_by_parent, parent_id)
            result = await conn.execute(
                insert_sql,
                {
                    "code": seed.code,
                    "name": seed.name,
                    "kind": seed.kind,
                    "parent_id": parent_id,
                    "sort_order": sort_order,
                    "route_path": seed.route_path,
                    "component_key": seed.component_key,
                    "description": seed.description,
                    **audit,
                },
            )
            mapping[seed.code] = int(result.lastrowid)


def _binding_pairs(code_to_id_map: dict[str, int]) -> list[tuple[int, int]]:
    pairs: list[tuple[int, int]] = []
    for seed in PERMISSION_SEEDS:
        if not seed.api_codes:
            continue
        pid = code_to_id_map.get(seed.code)
        if pid is None:
            continue
        for api_code in seed.api_codes:
            aid = code_to_id_map.get(api_code)
            if aid is not None:
                pairs.append((pid, aid))
    return pairs


async def sync_seed_bindings(engine: AsyncEngine) -> None:
    mapping = await code_to_id(engine)
    pairs = _binding_pairs(mapping)
    if not pairs:
        return
    insert_sql = text(
        f"INSERT IGNORE INTO {_B} "
        "(permission_id, api_permission_id, created_by, updated_by) "
        "VALUES (:pid, :aid, :created_by, :updated_by)"
    )
    audit = audit_insert_params()
    async with engine.begin() as conn:
        for pid, aid in pairs:
            await conn.execute(insert_sql, {"pid": pid, "aid": aid, **audit})


async def sync_seed_api_routes(engine: AsyncEngine) -> None:
    mapping = await code_to_id(engine)
    insert_sql = text(
        f"INSERT IGNORE INTO {_R} "
        "(permission_id, api_method, api_path_pattern, created_by, updated_by) "
        "VALUES (:pid, :method, :pattern, :created_by, :updated_by)"
    )
    audit = audit_insert_params()
    async with engine.begin() as conn:
        for code, method, pattern in API_ROUTE_SEEDS:
            pid = mapping.get(code)
            if pid is None:
                continue
            await conn.execute(
                insert_sql,
                {
                    "pid": pid,
                    "method": method.upper(),
                    "pattern": pattern,
                    **audit,
                },
            )


async def sync_catalog_defaults(engine: AsyncEngine) -> None:
    """目录名称与默认排序以种子为准：设置 > 系统配置 > 平台管理。"""
    mapping = await code_to_id(engine)
    update_sql = text(
        f"UPDATE {_P} SET name=:name, sort_order=:sort_order, updated_by=:updated_by "
        "WHERE code=:code AND kind='catalog' AND is_system=1"
    )
    async with engine.begin() as conn:
        for seed in PERMISSION_SEEDS:
            if seed.kind != "catalog" or seed.code not in mapping:
                continue
            await conn.execute(
                update_sql,
                {
                    "code": seed.code,
                    "name": seed.name,
                    "sort_order": seed.sort_order,
                    **audit_update_params(),
                },
            )


async def sync_system_metadata(engine: AsyncEngine) -> None:
    """将系统种子的类型、路由、父子关系同步至 DB（不覆盖 name/enabled/sort_order）。"""
    mapping = await code_to_id(engine)
    update_sql = text(
        f"UPDATE {_P} SET kind=:kind, route_path=:route_path, "
        "component_key=:component_key, parent_id=:parent_id, updated_by=:updated_by "
        "WHERE code=:code AND is_system=1"
    )
    async with engine.begin() as conn:
        for seed in PERMISSION_SEEDS:
            if seed.code not in mapping:
                continue
            parent_id = mapping.get(seed.parent) if seed.parent else None
            await conn.execute(
                update_sql,
                {
                    "code": seed.code,
                    "kind": seed.kind,
                    "route_path": seed.route_path,
                    "component_key": seed.component_key,
                    "parent_id": parent_id,
                    **audit_update_params(),
                },
            )


async def run_seed_sync(engine: AsyncEngine) -> list[str]:
    """插入新增种子并同步绑定、路由与菜单元数据；返回新增 code 列表。"""
    existing = await existing_codes(engine)
    new_seeds = [s for s in PERMISSION_SEEDS if s.code not in existing]
    if new_seeds:
        await insert_seed_batch(engine, tuple(new_seeds))
        logger.info("已同步新增权限: %s", ", ".join(s.code for s in new_seeds))
    await sync_system_metadata(engine)
    await sync_catalog_defaults(engine)
    await sync_seed_bindings(engine)
    await sync_seed_api_routes(engine)
    return [s.code for s in new_seeds]
