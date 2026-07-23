"""RoleCreate 校验测试。"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from omni_api.schemas.rbac import RoleCreate


def test_role_create_accepts_valid_code() -> None:
    role = RoleCreate(code="ops_lead-1", name="运维负责人")
    assert role.code == "ops_lead-1"
    assert role.name == "运维负责人"


def test_role_create_rejects_invalid_code() -> None:
    with pytest.raises(ValidationError):
        RoleCreate(code="bad code", name="测试")


def test_role_create_requires_name() -> None:
    with pytest.raises(ValidationError):
        RoleCreate(code="viewer2", name="   ")
