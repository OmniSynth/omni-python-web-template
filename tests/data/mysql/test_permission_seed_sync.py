"""权限种子同步排序规则单元测试。"""

from __future__ import annotations

from omni_api.data.mysql.permission_seed_sync import next_append_sort_order


def test_next_append_sort_order_starts_at_zero_for_empty_parent() -> None:
    max_by_parent: dict[str, int] = {}
    assert next_append_sort_order(max_by_parent, None) == 0
    assert next_append_sort_order(max_by_parent, None) == 1


def test_next_append_sort_order_appends_after_existing_max() -> None:
    max_by_parent = {"42": 3}
    assert next_append_sort_order(max_by_parent, 42) == 4
    assert next_append_sort_order(max_by_parent, 42) == 5


def test_next_append_sort_order_isolated_by_parent() -> None:
    max_by_parent = {"1": 2, "2": 5}
    assert next_append_sort_order(max_by_parent, 1) == 3
    assert next_append_sort_order(max_by_parent, 2) == 6
    assert next_append_sort_order(max_by_parent, 99) == 0
