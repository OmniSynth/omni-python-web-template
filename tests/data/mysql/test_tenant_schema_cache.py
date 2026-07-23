"""租户 schema 缓存：热路径不重复 DDL。"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from omni_api.data.mysql.tenant_schema_cache import (
    clear_tenant_schema_cache,
    ensure_tenant_biz_provisioned,
    is_tenant_biz_provisioned,
)


@pytest.fixture(autouse=True)
def _clear_cache() -> None:
    clear_tenant_schema_cache()


def _mock_engine_with_table_count(count: int) -> MagicMock:
    engine = MagicMock()
    conn = AsyncMock()
    result = MagicMock()
    result.fetchone.return_value = (count,)
    conn.execute.return_value = result
    engine.connect.return_value.__aenter__.return_value = conn
    return engine


def test_is_tenant_biz_provisioned_caches_after_probe() -> None:
    engine = _mock_engine_with_table_count(15)

    async def _run() -> None:
        assert await is_tenant_biz_provisioned(engine, 1) is True
        assert await is_tenant_biz_provisioned(engine, 1) is True

    asyncio.run(_run())
    engine.connect.assert_called_once()


def test_ensure_tenant_biz_provisioned_skips_ddl_when_ready() -> None:
    engine = _mock_engine_with_table_count(15)

    async def _run() -> None:
        with patch(
            "omni_api.services.tenant_provisioner.TenantProvisioner.provision_ddl",
            new_callable=AsyncMock,
        ) as provision_ddl:
            await ensure_tenant_biz_provisioned(engine, 1)
            provision_ddl.assert_not_called()

    asyncio.run(_run())
