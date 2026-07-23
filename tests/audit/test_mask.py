"""脱敏工具测试。"""

from omni_api.audit.mask import mask_value, truncate_text


def test_mask_password_key() -> None:
    data = {"username": "alice", "password": "secret123"}
    masked = mask_value(data)
    assert masked["username"] == "alice"
    assert masked["password"] == "***"


def test_mask_nested_token() -> None:
    data = {"auth": {"access_token": "abc", "user": "x"}}
    masked = mask_value(data)
    assert masked["auth"]["access_token"] == "***"
    assert masked["auth"]["user"] == "x"


def test_truncate_text() -> None:
    assert truncate_text("a" * 600, 100) is not None
    assert len(truncate_text("a" * 600, 100) or "") <= 100
