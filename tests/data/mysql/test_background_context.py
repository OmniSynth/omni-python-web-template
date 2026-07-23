"""后台 MySQL 上下文测试。"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor

from omni_api.data.mysql.actor import get_actor_id, reset_actor_token, set_actor_id
from omni_api.data.mysql.background_context import (
    BackgroundMysqlContext,
    capture_background_mysql_context,
    use_background_mysql_context,
)
from omni_api.data.mysql.tenant_context import get_tenant_id, reset_session, set_session


def test_capture_and_restore_background_mysql_context() -> None:
    token = set_session(
        {
            "user_id": 9,
            "tenant_id": 2,
            "dept_id": 3,
            "username": "alice",
        }
    )
    actor_token = set_actor_id(9)
    try:
        captured = capture_background_mysql_context()
        assert captured.tenant_id == 2
        assert captured.dept_id == 3
        assert captured.actor_id == 9

        async def _run() -> None:
            async with use_background_mysql_context(
                BackgroundMysqlContext(
                    tenant_id=7,
                    dept_id=8,
                    user_id=10,
                    actor_id=11,
                    actor_username="bob",
                )
            ):
                assert get_tenant_id() == 7
                assert get_actor_id() == 11

            assert get_tenant_id() == 2
            assert get_actor_id() == 9

        asyncio.run(_run())
    finally:
        from omni_api.data.mysql.actor import reset_actor_token

        reset_actor_token(actor_token)
        reset_session(token)


def test_run_coroutine_threadsafe_with_background_context() -> None:
    async def _main() -> None:
        token = set_session(
            {
                "user_id": 5,
                "tenant_id": 4,
                "dept_id": None,
                "username": "trainer",
            }
        )
        actor_token = set_actor_id(5)
        try:
            ctx = capture_background_mysql_context()
            loop = asyncio.get_running_loop()

            async def _check() -> int:
                async with use_background_mysql_context(ctx):
                    assert get_tenant_id() == 4
                    assert get_actor_id() == 5
                    return 1

            with ThreadPoolExecutor(max_workers=1) as pool:
                result = await loop.run_in_executor(
                    pool,
                    lambda: asyncio.run_coroutine_threadsafe(_check(), loop).result(),
                )
            assert result == 1
        finally:
            reset_actor_token(actor_token)
            reset_session(token)

    asyncio.run(_main())
