"""租户编码生成测试。"""

from __future__ import annotations

import pytest

from omni_api.services.tenant_code import (
    build_code_prefix,
    industry_prefix,
    normalize_region,
    _parse_seq_from_code,
)


def test_industry_prefix_from_org_type() -> None:
    assert industry_prefix("company") == "co"
    assert industry_prefix("government") == "gv"
    assert industry_prefix(None) == "gn"


def test_normalize_region() -> None:
    assert normalize_region("BJ") == "bj"
    assert normalize_region(" sh ") == "sh"


def test_normalize_region_too_short() -> None:
    with pytest.raises(ValueError):
        normalize_region("b")


def test_build_code_prefix() -> None:
    assert build_code_prefix("school", "gd") == "sc-gd"
    assert build_code_prefix("company", "110105") == "co-110105"


def test_parse_seq_from_code() -> None:
    assert _parse_seq_from_code("co-110105-0003", "co-110105") == 3
    assert _parse_seq_from_code("co1101050002", "co-110105") is None
    assert _parse_seq_from_code("co-110105-abc", "co-110105") is None
