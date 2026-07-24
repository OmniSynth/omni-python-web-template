"""Redis Session 业务编排。"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.data.redis.session_store import SessionStore
from omni_api.schemas.auth import AuthUser, LoginRequest, LoginResponse
from omni_api.schemas.tenant import BoundTenantInfo, UserTenantBinding
from omni_api.services.auth_credentials import AuthError, verify_password
from omni_api.services.effective_permissions import resolve_user_permissions
from omni_api.services.session_resolve_cache import (
    _MissingType,
    get_cached_session,
    get_cached_tenant_active,
    set_cached_session,
    set_cached_tenant_active,
)
from omni_api.services.tenant_expiry import TENANT_EXPIRED_MSG, is_expired_at

logger = logging.getLogger(__name__)

NO_TENANT_ACCESS_MSG = "未开通访问权限，请联系管理员"


class SessionService:
    """登录、登出、解析与切换租户。"""

    def __init__(self) -> None:
        self._store = SessionStore()
        engine = mysql_engine()
        self._users = UserRepo(engine)
        self._tenants = TenantRepo(engine)
        self._engine = engine

    async def _build_bound_tenants(self, user_id: int) -> list[dict[str, Any]]:
        infos = await self._tenants.list_bound_tenant_infos(user_id)
        return [i.model_dump() for i in infos]

    async def _resolve_tenant_context(
        self, user_id: int, bindings: list[UserTenantBinding]
    ) -> tuple[int | None, int | None, bool]:
        _ = user_id
        if not bindings:
            raise AuthError("未绑定任何租户")
        if len(bindings) == 1:
            b = bindings[0]
            return b.tenant_id, b.dept_id, False
        with_login = [b for b in bindings if b.last_login_at is not None]
        if with_login:
            b = with_login[0]
            return b.tenant_id, b.dept_id, False
        return None, None, True

    async def _load_auth_snapshot(
        self,
        user_id: int,
        username: str,
        display_name: str,
        tenant_id: int | None,
        dept_id: int | None,
        bound_tenants: list[dict[str, Any]],
        need_tenant_select: bool,
        *,
        sync_tenant_permissions: bool = False,
        avatar_url: str | None = None,
    ) -> dict[str, Any]:
        roles: list[str] = []
        permissions: list[str] = []
        if tenant_id is not None and not need_tenant_select:
            role_repo = RoleRepo(self._engine, tenant_id=tenant_id)
            if sync_tenant_permissions:
                try:
                    await role_repo.sync_tenant_system_role_permissions(tenant_id)
                except ValueError as exc:
                    logger.warning("租户 %s 权限同步失败: %s", tenant_id, exc)
            roles, perms = await resolve_user_permissions(
                self._engine, user_id, tenant_id
            )
            permissions = sorted(perms)
        elif not need_tenant_select:
            roles, perms = await resolve_user_permissions(
                self._engine, user_id, None
            )
            permissions = sorted(perms)
        return {
            "user_id": user_id,
            "username": username,
            "display_name": display_name,
            "avatar_url": avatar_url,
            "tenant_id": tenant_id,
            "dept_id": dept_id,
            "roles": roles,
            "permissions": permissions,
            "bound_tenants": bound_tenants,
            "need_tenant_select": need_tenant_select,
        }

    def _to_auth_user(self, session: dict[str, Any]) -> AuthUser:
        return AuthUser(
            id=int(session["user_id"]),
            username=str(session["username"]),
            display_name=str(session["display_name"]),
            avatar_url=session.get("avatar_url"),
            roles=list(session.get("roles") or []),
            permissions=list(session.get("permissions") or []),
            tenant_id=session.get("tenant_id"),
            dept_id=session.get("dept_id"),
            need_tenant_select=bool(session.get("need_tenant_select")),
        )

    @staticmethod
    def _snapshot_has_tenant_access(snapshot: dict[str, Any]) -> bool:
        return bool(snapshot.get("roles") or snapshot.get("permissions"))

    async def _degrade_session_snapshot(self, session: dict[str, Any]) -> dict[str, Any]:
        user_id = int(session["user_id"])
        bound = await self._build_bound_tenants(user_id)
        return await self._load_auth_snapshot(
            user_id,
            str(session["username"]),
            str(session["display_name"]),
            None,
            None,
            bound,
            True,
        )

    async def _ensure_active_tenant_session(
        self, token: str, session: dict[str, Any]
    ) -> dict[str, Any] | None:
        tenant_id = session.get("tenant_id")
        if tenant_id is None or session.get("need_tenant_select"):
            return session
        tid = int(tenant_id)
        if await self._tenants.is_tenant_expired(tid):
            await asyncio.to_thread(
                self._store.delete, token, reason=TENANT_EXPIRED_MSG
            )
            set_cached_session(token, None)
            return None
        user_id = int(session["user_id"])
        cached_active = get_cached_tenant_active(user_id, tid)
        if not isinstance(cached_active, _MissingType):
            if cached_active:
                return session
            degraded = await self._degrade_session_snapshot(session)
            updated = await asyncio.to_thread(self._store.update, token, degraded)
            return updated if updated is not None else degraded
        active = await self._tenants.is_user_active_in_tenant(user_id, tid)
        set_cached_tenant_active(user_id, tid, active)
        if active:
            return session
        degraded = await self._degrade_session_snapshot(session)
        updated = await asyncio.to_thread(self._store.update, token, degraded)
        return updated if updated is not None else degraded

    async def _filter_usable_bindings(
        self, bindings: list[UserTenantBinding]
    ) -> list[UserTenantBinding]:
        usable: list[UserTenantBinding] = []
        had_expired = False
        for binding in bindings:
            tenant = await self._tenants.get_by_id(binding.tenant_id)
            if tenant is None or not tenant.enabled:
                continue
            if is_expired_at(tenant.expires_at):
                had_expired = True
                continue
            usable.append(binding)
        if not usable and had_expired:
            raise AuthError(TENANT_EXPIRED_MSG)
        return usable

    async def invalidate_tenant_access(self, user_id: int, tenant_id: int) -> None:
        tokens = await asyncio.to_thread(self._store.list_user_tokens, user_id)

        async def _patch_one(token: str) -> None:
            session = await asyncio.to_thread(self._store.get, token)
            if session is None or session.get("tenant_id") != tenant_id:
                return
            degraded = await self._degrade_session_snapshot(session)
            await asyncio.to_thread(self._store.update, token, degraded)

        await asyncio.gather(*[_patch_one(t) for t in tokens])

    async def login(self, body: LoginRequest) -> LoginResponse:
        row = await self._users.get_by_username(body.username)
        if row is None:
            raise AuthError("用户名或密码错误")
        user, password_hash = row
        if not user.enabled:
            raise AuthError("账号已禁用")
        if not verify_password(body.password, password_hash):
            raise AuthError("用户名或密码错误")
        bindings = await self._tenants.list_user_bindings(user.id)
        if not bindings:
            raise AuthError("未绑定任何租户")
        bindings = await self._filter_usable_bindings(bindings)
        if not bindings:
            raise AuthError("未绑定任何租户")
        tenant_id, dept_id, need_select = await self._resolve_tenant_context(
            user.id, bindings
        )
        bound = await self._build_bound_tenants(user.id)
        avatar_url = await self._users.get_avatar_url(user.id)
        snapshot = await self._load_auth_snapshot(
            user.id,
            user.username,
            user.display_name,
            tenant_id,
            dept_id,
            bound,
            need_select,
            avatar_url=avatar_url,
        )
        if tenant_id is not None and not need_select and not self._snapshot_has_tenant_access(
            snapshot
        ):
            snapshot = await self._load_auth_snapshot(
                user.id,
                user.username,
                user.display_name,
                None,
                None,
                bound,
                True,
                avatar_url=avatar_url,
            )
            need_select = True
            tenant_id = None
        token = self._store.create(snapshot)
        if tenant_id is not None and not need_select:
            await self._tenants.update_last_login(user.id, tenant_id)
        auth_user = self._to_auth_user(snapshot)
        return LoginResponse(
            session_token=token,
            user=auth_user,
            need_tenant_select=need_select,
        )

    async def resolve(self, token: str) -> dict[str, Any] | None:
        cached = get_cached_session(token)
        if not isinstance(cached, _MissingType):
            if cached is None:
                return None
            return await self._ensure_active_tenant_session(token, cached)
        session = await asyncio.to_thread(self._store.get, token)
        if session is None:
            set_cached_session(token, None)
            return None
        user = await self._users.get_by_id(int(session["user_id"]))
        if user is None or not user.enabled:
            await asyncio.to_thread(self._store.delete, token)
            set_cached_session(token, None)
            return None
        session = await self._ensure_active_tenant_session(token, session)
        if session is None:
            return None
        set_cached_session(token, session)
        return session

    def take_session_kick_reason(self, token: str) -> str | None:
        return self._store.take_kick_reason(token)

    async def auth_user_from_token(self, token: str) -> AuthUser:
        """从 Redis 会话读取当前用户，不触发 DB 权限全量同步（供页面刷新 fast path）。"""
        session = await self.resolve(token)
        if session is None:
            reason = self.take_session_kick_reason(token)
            raise AuthError(reason or "登录已失效，请重新登录")
        return self._to_auth_user(session)

    async def logout(self, token: str) -> None:
        self._store.delete(token)

    async def switch_tenant(self, token: str, tenant_id: int) -> AuthUser:
        session = await self.resolve(token)
        if session is None:
            reason = self.take_session_kick_reason(token)
            raise AuthError(reason or "登录已失效，请重新登录")
        user_id = int(session["user_id"])
        if not await self._tenants.is_user_active_in_tenant(user_id, tenant_id):
            raise AuthError("无权访问该租户")
        if await self._tenants.is_tenant_expired(tenant_id):
            raise AuthError(TENANT_EXPIRED_MSG)
        dept_id = await self._tenants.get_user_dept_id(user_id, tenant_id)
        bound = await self._build_bound_tenants(user_id)
        snapshot = await self._load_auth_snapshot(
            user_id,
            str(session["username"]),
            str(session["display_name"]),
            tenant_id,
            dept_id,
            bound,
            False,
            sync_tenant_permissions=True,
            avatar_url=session.get("avatar_url"),
        )
        if not self._snapshot_has_tenant_access(snapshot):
            raise AuthError(NO_TENANT_ACCESS_MSG)
        updated = self._store.update(token, snapshot)
        if updated is None:
            raise AuthError("会话更新失败")
        await self._tenants.update_last_login(user_id, tenant_id)
        return self._to_auth_user(updated)

    async def refresh(self, token: str) -> AuthUser:
        """从 DB 重载当前租户角色与权限，写回 Redis 会话。"""
        session = await self.resolve(token)
        if session is None:
            reason = self.take_session_kick_reason(token)
            raise AuthError(reason or "登录已失效，请重新登录")
        if session.get("need_tenant_select") or session.get("tenant_id") is None:
            return self._to_auth_user(session)
        user_id = int(session["user_id"])
        tenant_id = int(session["tenant_id"])
        if await self._tenants.is_tenant_expired(tenant_id):
            await asyncio.to_thread(
                self._store.delete, token, reason=TENANT_EXPIRED_MSG
            )
            set_cached_session(token, None)
            raise AuthError(TENANT_EXPIRED_MSG)
        if not await self._tenants.is_user_active_in_tenant(user_id, tenant_id):
            bound = await self._build_bound_tenants(user_id)
            snapshot = await self._load_auth_snapshot(
                user_id,
                str(session["username"]),
                str(session["display_name"]),
                None,
                None,
                bound,
                True,
            )
            updated = self._store.update(token, snapshot)
            if updated is None:
                raise AuthError("会话更新失败")
            return self._to_auth_user(updated)
        dept_id = await self._tenants.get_user_dept_id(user_id, tenant_id)
        user = await self._users.get_by_id(user_id, tenant_id)
        display_name = user.display_name if user is not None else str(session["display_name"])
        avatar_url = await self._users.get_avatar_url(user_id)
        bound = await self._build_bound_tenants(user_id)
        snapshot = await self._load_auth_snapshot(
            user_id,
            str(session["username"]),
            display_name,
            tenant_id,
            dept_id,
            bound,
            False,
            sync_tenant_permissions=False,
            avatar_url=avatar_url,
        )
        if not self._snapshot_has_tenant_access(snapshot):
            bound = await self._build_bound_tenants(user_id)
            snapshot = await self._load_auth_snapshot(
                user_id,
                str(session["username"]),
                display_name,
                None,
                None,
                bound,
                True,
                avatar_url=avatar_url,
            )
        updated = self._store.update(token, snapshot)
        if updated is None:
            raise AuthError("会话更新失败")
        return self._to_auth_user(updated)

    async def list_bound_tenants(self, token: str) -> list[BoundTenantInfo]:
        session = await self.resolve(token)
        if session is None:
            reason = self.take_session_kick_reason(token)
            raise AuthError(reason or "登录已失效，请重新登录")
        return await self._tenants.list_bound_tenant_infos(int(session["user_id"]))

    async def patch_profile(
        self, token: str, display_name: str, avatar_url: str | None
    ) -> None:
        updated = await asyncio.to_thread(
            self._store.update,
            token,
            {"display_name": display_name, "avatar_url": avatar_url},
        )
        if updated is not None:
            set_cached_session(token, updated)

    async def revoke_other_sessions(self, user_id: int, keep_token: str) -> None:
        await asyncio.to_thread(
            self._store.revoke_other_sessions, user_id, keep_token
        )
