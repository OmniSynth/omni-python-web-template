"""表格偏好 schema 与 list_sort 测试。"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from omni_api.data.mysql.list_sort import build_order_clause
from omni_api.data.mysql.table_preference_repo import TablePreferenceRepo
from omni_api.schemas.table_preference import TablePreferenceConfig


def test_build_order_clause_whitelist() -> None:
    allowed = {"id": "u.id", "username": "u.username"}
    assert build_order_clause("username", "desc", allowed, default_field="id") == " ORDER BY u.username DESC"
    assert build_order_clause("bad", "desc", allowed, default_field="id") == " ORDER BY u.id DESC"


def test_table_preference_config_roundtrip() -> None:
    cfg = TablePreferenceConfig.model_validate(
        {
            "rowHeight": 40,
            "sort": {"columnId": "username", "order": "asc"},
            "columns": {"username": {"visible": True, "width": 120, "order": 0}},
        }
    )
    data = cfg.model_dump(mode="json", by_alias=True)
    restored = TablePreferenceConfig.model_validate(data)
    assert restored.row_height == 40
    assert restored.sort is not None
    assert restored.sort.column_id == "username"


def test_table_preference_get_response_camel_case_json() -> None:
    """GET 响应 JSON 须为前端 camelCase（rowHeight、sort.columnId）。"""
    cfg = TablePreferenceConfig.model_validate(
        {
            "rowHeight": 36,
            "sort": {"columnId": "username", "order": "desc"},
            "columns": {"username": {"visible": True, "order": 0}},
        }
    )
    from omni_api.schemas.table_preference import TablePreferenceGetResponse

    resp = TablePreferenceGetResponse(
        page_key="users",
        table_key="main",
        config=cfg,
        updated_at=datetime(2026, 1, 1, 0, 0, 0),
    )
    data = resp.model_dump(mode="json", by_alias=True)
    assert data["config"]["rowHeight"] == 36
    assert data["config"]["sort"]["columnId"] == "username"
    assert data["config"]["sort"]["order"] == "desc"


def test_table_preference_config_accepts_camel_case() -> None:
    """前端 PUT 使用 camelCase（rowHeight、sort.columnId）。"""
    raw = {
        "version": 1,
        "rowHeight": 40,
        "sort": {"columnId": "username", "order": "desc"},
        "columns": {"username": {"visible": True, "width": 120, "order": 0}},
    }
    cfg = TablePreferenceConfig.model_validate(raw)
    assert cfg.row_height == 40
    assert cfg.sort is not None
    assert cfg.sort.column_id == "username"
    assert cfg.sort.order == "desc"
    dumped = cfg.model_dump(mode="json", by_alias=True)
    assert dumped["rowHeight"] == 40
    assert dumped["sort"]["columnId"] == "username"


def test_table_preference_config_pinned_column_roundtrip() -> None:
    """列固定 pinned 须随 config_json 持久化。"""
    raw = {
        "version": 1,
        "rowHeight": 36,
        "columns": {
            "username": {"visible": True, "pinned": True, "order": 0, "width": 120},
            "email": {"visible": True, "pinned": False, "order": 1},
        },
    }
    cfg = TablePreferenceConfig.model_validate(raw)
    assert cfg.columns["username"].pinned is True
    assert cfg.columns["email"].pinned is False
    dumped = cfg.model_dump(mode="json", by_alias=True)
    restored = TablePreferenceConfig.model_validate(dumped)
    assert restored.columns["username"].pinned is True


def test_table_preference_config_action_order_roundtrip() -> None:
    """操作列按钮排序 actionOrder 须随 config_json 持久化。"""
    raw = {
        "version": 1,
        "rowHeight": 36,
        "columns": {
            "actions": {
                "visible": True,
                "order": 99,
                "width": 120,
                "actionOrder": ["detail", "edit", "book"],
            },
        },
    }
    cfg = TablePreferenceConfig.model_validate(raw)
    assert cfg.columns["actions"].action_order == ["detail", "edit", "book"]
    dumped = cfg.model_dump(mode="json", by_alias=True)
    assert dumped["columns"]["actions"]["actionOrder"] == ["detail", "edit", "book"]
    restored = TablePreferenceConfig.model_validate(dumped)
    assert restored.columns["actions"].action_order == ["detail", "edit", "book"]


def test_table_preference_repo_get_and_upsert() -> None:
    async def _run() -> None:
        now = datetime(2026, 1, 1, 0, 0, 0)
        cfg = TablePreferenceConfig.model_validate({"rowHeight": 36, "columns": {}})
        conn = MagicMock()
        conn.execute = AsyncMock(
            side_effect=[
                MagicMock(fetchone=lambda: None),
                MagicMock(),
                MagicMock(
                    fetchone=lambda: (
                        json.dumps(cfg.model_dump(mode="json", by_alias=True), ensure_ascii=False),
                        now,
                    )
                ),
            ]
        )
        engine = MagicMock()
        engine.connect = MagicMock()
        engine.connect.return_value.__aenter__ = AsyncMock(return_value=conn)
        engine.connect.return_value.__aexit__ = AsyncMock(return_value=None)
        engine.begin = MagicMock()
        engine.begin.return_value.__aenter__ = AsyncMock(return_value=conn)
        engine.begin.return_value.__aexit__ = AsyncMock(return_value=None)

        repo = TablePreferenceRepo(engine)
        assert await repo.get(1, "users", "main") is None
        record = await repo.upsert(1, "users", "main", cfg, actor_id=1)
        assert record.page_key == "users"
        assert record.config.row_height == 36

    asyncio.run(_run())
