"""MySQL UTC 时间工具测试。"""

from datetime import datetime, timedelta, timezone

from omni_api.data.mysql.utc import naive_utc, utc_now


def test_utc_now_is_naive_and_current() -> None:
    now = utc_now()
    assert now.tzinfo is None
    expected = datetime.now(timezone.utc).replace(tzinfo=None)
    assert abs((now - expected).total_seconds()) < 2


def test_naive_utc_converts_aware_to_utc_naive() -> None:
    shanghai = timezone(timedelta(hours=8))
    aware = datetime(2026, 6, 29, 20, 0, 0, tzinfo=shanghai)
    result = naive_utc(aware)
    assert result.tzinfo is None
    assert result == datetime(2026, 6, 29, 12, 0, 0)


def test_naive_utc_passes_through_naive() -> None:
    naive = datetime(2026, 1, 1, 12, 0, 0)
    assert naive_utc(naive) is naive
