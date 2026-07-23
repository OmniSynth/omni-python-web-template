"""慢 SQL EXPLAIN 分析测试。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from omni_api.audit.sql_explain import (
    has_unbound_params,
    is_explainable,
    run_explain,
    summarize_explain_plan,
)


def test_is_explainable_select() -> None:
    assert is_explainable("SELECT * FROM users WHERE id = 1")
    assert is_explainable("  WITH cte AS (SELECT 1) SELECT * FROM cte")


def test_is_explainable_skips_dml() -> None:
    assert not is_explainable("INSERT INTO users VALUES (1)")
    assert not is_explainable("UPDATE users SET name='a'")
    assert not is_explainable("DELETE FROM users")
    assert not is_explainable("EXPLAIN SELECT 1")


def test_has_unbound_params() -> None:
    assert has_unbound_params("SELECT * FROM users WHERE id = %s")
    assert has_unbound_params("SELECT * FROM users WHERE id = :user_id")
    assert not has_unbound_params("SELECT * FROM users WHERE id = 1")


def test_summarize_explain_plan() -> None:
    plan = [
        {
            "id": 1,
            "select_type": "SIMPLE",
            "table": "users",
            "type": "ALL",
            "possible_keys": None,
            "key": None,
            "key_len": None,
            "ref": None,
            "rows": 5000,
            "filtered": 10.0,
            "Extra": "Using where; Using filesort",
        },
        {
            "id": 1,
            "select_type": "SIMPLE",
            "table": "roles",
            "type": "ref",
            "possible_keys": "idx_user",
            "key": "idx_user",
            "key_len": "8",
            "ref": "db.users.id",
            "rows": 2,
            "filtered": 100.0,
            "Extra": None,
        },
    ]
    summary = summarize_explain_plan(plan)
    assert summary["max_rows_examined"] == 5000
    assert summary["uses_index"] is True
    assert "Using filesort" in summary["warnings"]


def test_run_explain_binds_parameters() -> None:
    engine = MagicMock()
    conn = AsyncMock()
    result = MagicMock()
    result.mappings.return_value.all.return_value = [
        {"id": 1, "select_type": "SIMPLE", "table": "users", "type": "const", "rows": 1, "Extra": None}
    ]
    conn.exec_driver_sql = AsyncMock(return_value=result)
    conn.__aenter__ = AsyncMock(return_value=conn)
    conn.__aexit__ = AsyncMock(return_value=None)
    engine.connect.return_value = conn

    with patch("omni_api.audit.sql_explain.bump_sql_audit_depth"), patch(
        "omni_api.audit.sql_explain.reset_sql_audit_depth"
    ):
        out = asyncio.run(
            run_explain(
                engine,
                "SELECT * FROM users WHERE id = %s",
                (42,),
            )
        )

    assert out["status"] == "ok"
    conn.exec_driver_sql.assert_awaited_once()
    call_args = conn.exec_driver_sql.await_args
    assert "EXPLAIN FORMAT=TRADITIONAL" in call_args.args[0]
    assert call_args.args[1] == (42,)


def test_run_explain_skips_only_when_params_missing() -> None:
    engine = MagicMock()
    out = asyncio.run(run_explain(engine, "SELECT * FROM users WHERE id = %s", None))
    assert out["status"] == "skipped"
    assert out["reason"] == "missing_parameters"
    engine.connect.assert_not_called()
