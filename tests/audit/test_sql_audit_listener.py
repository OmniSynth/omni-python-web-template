"""慢 SQL 审计 listener 单元测试。"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from omni_api.audit.mask import truncate_text
from omni_api.audit.sql_text import sql_fingerprint
from omni_api.data.mysql import sql_audit_listener as listener


def test_truncate_sql_long_text() -> None:
    long_sql = "SELECT " + "x" * 5000
    result = truncate_text(long_sql, 4096)
    assert result is not None
    assert len(result) <= 4096


def test_sql_fingerprint_stable() -> None:
    a = sql_fingerprint("SELECT * FROM users WHERE id = 1")
    b = sql_fingerprint("SELECT * FROM users WHERE id = 2")
    assert a == b


def test_should_skip_audit_table() -> None:
    assert listener._should_skip("INSERT INTO t_sys_audit_request_logs VALUES (1)")


def test_should_skip_when_depth_positive() -> None:
    token = listener.bump_sql_audit_depth()
    try:
        assert listener._should_skip("SELECT 1")
    finally:
        listener.reset_sql_audit_depth(token)


def test_finalize_enqueues_slow_query(monkeypatch: pytest.MonkeyPatch) -> None:
    events: list[listener.SlowSqlEvent] = []

    class FakeQueue:
        def put_nowait(self, item: listener.SlowSqlEvent) -> None:
            events.append(item)

    monkeypatch.setattr(listener, "_queue", FakeQueue())
    monkeypatch.setattr(listener, "_schedule_enqueue", lambda e: events.append(e))

    conn = MagicMock()
    conn.info = {listener._TIMING_KEY: 0.0}
    cursor = MagicMock()
    cursor.rowcount = 5

    import time

    monkeypatch.setattr(time, "monotonic", lambda: 1.0)
    listener._finalize(conn, cursor, "SELECT * FROM t_biz_users", failed=False)
    assert len(events) == 1
    assert events[0].duration_ms >= 1000
    assert "t_biz_users" in events[0].sql_text
