"""用户创建 DTO 校验测试。"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from omni_api.schemas.auth import TenantUserCreate, UserCreate


def test_user_create_requires_username_and_display_name() -> None:
    user = UserCreate(
        username="13800138000",
        password="secret1",
        display_name="张三",
    )
    assert user.username == "13800138000"
    assert user.display_name == "张三"


def test_user_create_rejects_empty_display_name() -> None:
    with pytest.raises(ValidationError):
        UserCreate(username="13800138000", password="secret1", display_name="  ")


def test_tenant_user_create_requires_display_name() -> None:
    with pytest.raises(ValidationError):
        TenantUserCreate(
            username="13800138000",
            display_name="",
            dept_id=1,
        )
