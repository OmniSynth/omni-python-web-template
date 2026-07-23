"""慢 SQL 业务分级：按 HTTP 路由映射 tier 与阈值。"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

from omni_api.config.settings import AuditSettings, SlowSqlThresholdSettings, get_settings

SqlTier = Literal["oltp", "polling", "data", "artifact"]
SqlSeverity = Literal["slow", "critical"]


@dataclass(frozen=True)
class TierThresholds:
    warn_ms: int
    critical_ms: int


# 更具体规则在前
_ARTIFACT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("POST", re.compile(r"^/api/v1/audit/export$")),
)

_POLLING_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = ()

_DATA_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("GET", re.compile(r"^/api/v1/audit/")),
)

_OLTP_PREFIXES = (
    "/api/v1/auth",
    "/api/v1/users",
    "/api/v1/roles",
    "/api/v1/permissions",
    "/api/v1/orgs",
    "/api/v1/tenants",
    "/api/v1/depts",
    "/api/v1/tenant/",
)


def _match_patterns(
    method: str,
    path: str,
    patterns: tuple[tuple[str, re.Pattern[str]], ...],
) -> bool:
    upper = method.upper()
    for m, pattern in patterns:
        if m and upper != m:
            continue
        if pattern.search(path):
            return True
    return False


def classify_sql_tier(method: str | None, path: str | None) -> SqlTier:
    """按 HTTP method + path 划分慢 SQL 业务 tier。"""
    if not path:
        return "data"
    m = (method or "GET").upper()
    p = path.split("?")[0]

    if _match_patterns(m, p, _ARTIFACT_PATTERNS):
        return "artifact"
    if _match_patterns(m, p, _POLLING_PATTERNS):
        return "polling"
    if _match_patterns(m, p, _DATA_PATTERNS):
        return "data"
    for prefix in _OLTP_PREFIXES:
        if p.startswith(prefix):
            return "oltp"
    if m == "GET":
        return "oltp"
    return "data"


def _thresholds_from_settings(cfg: SlowSqlThresholdSettings) -> dict[SqlTier, TierThresholds]:
    return {
        "oltp": TierThresholds(cfg.oltp_warn_ms, cfg.oltp_critical_ms),
        "polling": TierThresholds(cfg.polling_warn_ms, cfg.polling_critical_ms),
        "data": TierThresholds(cfg.data_warn_ms, cfg.data_critical_ms),
        "artifact": TierThresholds(cfg.artifact_warn_ms, cfg.artifact_critical_ms),
    }


def tier_thresholds(
    tier: SqlTier,
    settings: AuditSettings | None = None,
) -> TierThresholds:
    cfg = (settings or get_settings().audit).slow_sql_thresholds
    return _thresholds_from_settings(cfg)[tier]


def classify_severity(
    duration_ms: int,
    tier: SqlTier,
    settings: AuditSettings | None = None,
) -> SqlSeverity | None:
    """未达 warn 阈值返回 None；否则 slow 或 critical。"""
    th = tier_thresholds(tier, settings)
    if duration_ms < th.warn_ms:
        return None
    if duration_ms >= th.critical_ms:
        return "critical"
    return "slow"


def threshold_ms_for_severity(
    severity: SqlSeverity,
    tier: SqlTier,
    settings: AuditSettings | None = None,
) -> int:
    th = tier_thresholds(tier, settings)
    return th.critical_ms if severity == "critical" else th.warn_ms
