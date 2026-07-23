"""API UTC 时间工具测试。"""

from datetime import datetime, timedelta, timezone

import pytest

from omni_api.schemas.utc_datetime import (
    format_api_utc,
    parse_api_utc,
    parse_api_utc_optional,
)


def test_format_api_utc_zero_microseconds() -> None:
    dt = datetime(2026, 6, 29, 12, 30, 55)
    assert format_api_utc(dt) == "2026-06-29T12:30:55.000000Z"


def test_format_api_utc_with_microseconds() -> None:
    dt = datetime(2026, 6, 29, 12, 30, 55, 123456)
    assert format_api_utc(dt) == "2026-06-29T12:30:55.123456Z"


def test_format_api_utc_converts_aware() -> None:
    shanghai = timezone(timedelta(hours=8))
    aware = datetime(2026, 6, 29, 20, 0, 0, tzinfo=shanghai)
    assert format_api_utc(aware) == "2026-06-29T12:00:00.000000Z"


def test_parse_api_utc_z_suffix() -> None:
    dt = parse_api_utc("2026-06-29T12:30:55.123456Z")
    assert dt == datetime(2026, 6, 29, 12, 30, 55, 123456)
    assert dt.tzinfo is None


def test_parse_api_utc_no_suffix() -> None:
    dt = parse_api_utc("2026-06-29T12:30:55")
    assert dt == datetime(2026, 6, 29, 12, 30, 55)
    assert dt.tzinfo is None


def test_parse_api_utc_offset() -> None:
    dt = parse_api_utc("2026-06-29T20:00:00+08:00")
    assert dt == datetime(2026, 6, 29, 12, 0, 0)


def test_parse_api_utc_optional() -> None:
    assert parse_api_utc_optional(None) is None
    assert parse_api_utc_optional("") is None
    assert parse_api_utc_optional("2026-01-01T00:00:00Z") == datetime(2026, 1, 1)


def test_parse_api_utc_empty_raises() -> None:
    with pytest.raises(ValueError, match="为空"):
        parse_api_utc("   ")
