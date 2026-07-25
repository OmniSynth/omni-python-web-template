"""租户套餐到期：常量、判定与软锁定同步。"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.utc import utc_now
from omni_api.data.redis.session_store import SessionStore
from omni_api.services.session_resolve_cache import set_cached_session

TENANT_EXPIRED_MSG = "套餐已过期，请联系管理员续费"
DEFAULT_TENANT_TTL_DAYS = 7
EXPIRED_TENANT_LIST_LIMIT = 500


def default_tenant_expires_at() -> datetime:
    """新租户默认到期时间（UTC naive）。"""
    return utc_now() + timedelta(days=DEFAULT_TENANT_TTL_DAYS)


def is_expired_at(expires_at: datetime | None) -> bool:
    """expires_at 为 None 视为永不过期。"""
    if expires_at is None:
        return False
    return expires_at <= utc_now()


async def sync_expired_tenant_session_flags(*, tenant_id: int | None = None) -> str:
    """将过期租户下在线会话标记为软锁定（保留会话，不踢下线）。"""
    tenants = TenantRepo(mysql_engine())
    store = SessionStore()
    expired_ids = await tenants.list_expired_tenant_ids(tenant_id=tenant_id)
    if not expired_ids:
        return "无过期租户会话"
    expired_set = set(expired_ids)
    user_ids = await tenants.list_user_ids_for_tenants(expired_ids)

    async def _mark_user(uid: int) -> int:
        tokens = await asyncio.to_thread(store.list_user_tokens, uid)
        count = 0
        for token in tokens:
            session = await asyncio.to_thread(store.get, token)
            if session is None:
                continue
            tid = session.get("tenant_id")
            if tid is None or int(tid) not in expired_set:
                continue
            if session.get("tenant_expired"):
                continue
            updated = await asyncio.to_thread(
                store.update, token, {"tenant_expired": True}
            )
            if updated is not None:
                set_cached_session(token, updated)
                count += 1
        return count

    marked = sum(await asyncio.gather(*[_mark_user(uid) for uid in user_ids]))
    return f"已软锁定 {marked} 个会话，涉及 {len(expired_ids)} 个过期租户"
