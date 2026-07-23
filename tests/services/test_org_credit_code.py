"""统一社会信用代码校验测试。"""

from __future__ import annotations

import pytest

from omni_api.services.org_credit_code import normalize_credit_code, validate_credit_code


def test_normalize_credit_code() -> None:
    assert normalize_credit_code(" 91110000ma01234567 ") == "91110000MA01234567"


def test_validate_credit_code_empty() -> None:
    assert validate_credit_code("") == ""


def test_validate_credit_code_valid() -> None:
    assert validate_credit_code("91110000MA01234567") == "91110000MA01234567"


def test_validate_credit_code_invalid_length() -> None:
    with pytest.raises(ValueError):
        validate_credit_code("123")


def test_ensure_org_credit_code_available_rejects_duplicate() -> None:
    import asyncio
    from unittest.mock import AsyncMock, MagicMock

    async def _run() -> None:
        engine = MagicMock()
        conn = MagicMock()
        conn.execute = AsyncMock(return_value=MagicMock(fetchone=MagicMock(return_value=(2,))))
        engine.connect = MagicMock(return_value=MagicMock(
            __aenter__=AsyncMock(return_value=conn),
            __aexit__=AsyncMock(return_value=None),
        ))
        with pytest.raises(ValueError, match="已被其他机构使用"):
            await ensure_org_credit_code_available(
                engine, "91110000MA01234567", exclude_org_id=1
            )

    from omni_api.services.org_credit_code import ensure_org_credit_code_available

    asyncio.run(_run())
