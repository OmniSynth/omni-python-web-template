"""SlowSqlLogRepo 筛选与行映射测试。"""

from __future__ import annotations

from datetime import datetime

from omni_api.data.mysql.slow_sql_repo import SlowSqlLogRepo, _row_to_slow_sql
from omni_api.schemas.audit_log import SlowSqlLogQuery


def test_row_to_slow_sql_maps_fields() -> None:
    row = (
        1,
        datetime(2026, 1, 1, 12, 0, 0),
        "req-1",
        "GET",
        "/api/v1/users",
        10,
        "admin",
        1,
        "oltp",
        "slow",
        120,
        50,
        "abc123",
        "SELECT 1",
        1,
        None,
    )
    record = _row_to_slow_sql(row)
    assert record.duration_ms == 120
    assert record.threshold_ms == 50
    assert record.sql_fingerprint == "abc123"
    assert record.sql_text == "SELECT 1"


def test_build_filters_all_fields() -> None:
    repo = SlowSqlLogRepo(engine=object())  # type: ignore[arg-type]
    q = SlowSqlLogQuery(
        occurred_from=datetime(2026, 1, 1),
        occurred_to=datetime(2026, 2, 1),
        tier="oltp",
        severity="slow",
        request_id="abc",
        keyword="SELECT",
    )
    where, params = repo._build_filters(q)
    assert "occurred_at >=" in where
    assert "tier = :tier" in where
    assert "severity = :severity" in where
    assert "request_id = :request_id" in where
    assert "sql_text LIKE :kw" in where
    assert params["tier"] == "oltp"
    assert params["severity"] == "slow"
