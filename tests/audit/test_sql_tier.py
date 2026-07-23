"""慢 SQL tier 分类与 severity 判定测试。"""

from __future__ import annotations

from omni_api.audit.sql_tier import (
    classify_severity,
    classify_sql_tier,
    tier_thresholds,
)
from omni_api.config.settings import AuditSettings, SlowSqlThresholdSettings


def test_classify_oltp_routes() -> None:
    assert classify_sql_tier("GET", "/api/v1/users") == "oltp"
    assert classify_sql_tier("POST", "/api/v1/auth/login") == "oltp"
    assert classify_sql_tier("GET", "/api/v1/roles") == "oltp"
    assert classify_sql_tier("GET", "/api/v1/tenant/users") == "oltp"


def test_classify_polling_routes_empty() -> None:
    # 训练轮询路由已移除；无专用 polling 规则时 GET 回落 oltp
    assert classify_sql_tier("GET", "/api/v1/scheduled-jobs") == "oltp"
    assert classify_sql_tier("GET", "/api/v1/dev-params/x") == "oltp"


def test_classify_artifact_routes() -> None:
    assert classify_sql_tier("POST", "/api/v1/audit/export") == "artifact"


def test_classify_data_routes() -> None:
    assert classify_sql_tier("GET", "/api/v1/audit/requests") == "data"
    assert classify_sql_tier("POST", "/api/v1/dev-params/foo") == "data"
    assert classify_sql_tier("POST", "/api/v1/scheduled-jobs/1/trigger") == "data"


def test_fallback_without_path() -> None:
    assert classify_sql_tier(None, None) == "data"


def test_classify_severity() -> None:
    cfg = AuditSettings(slow_sql_thresholds=SlowSqlThresholdSettings())
    assert classify_severity(30, "oltp", cfg) is None
    assert classify_severity(60, "oltp", cfg) == "slow"
    assert classify_severity(150, "oltp", cfg) == "critical"
    assert classify_severity(100, "polling", cfg) == "critical"
    assert classify_severity(150, "polling", cfg) == "critical"


def test_tier_thresholds_defaults() -> None:
    th = tier_thresholds("data")
    assert th.warn_ms == 500
    assert th.critical_ms == 2000
