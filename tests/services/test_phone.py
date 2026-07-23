"""手机号校验测试。"""

from __future__ import annotations

import pytest

from omni_api.services.phone import normalize_phone


def test_normalize_phone_valid() -> None:
    assert normalize_phone("13272272602") == "13272272602"


def test_normalize_phone_invalid() -> None:
    with pytest.raises(ValueError, match="手机号格式无效"):
        normalize_phone("12345")
