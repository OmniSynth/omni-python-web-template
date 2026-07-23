"""用户 MySQL 仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.actor import get_actor_id
from omni_api.data.mysql.biz_table import SYS_USER, SYS_USER_TENANT
from omni_api.data.mysql.list_sort import SortOrder, build_order_clause
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.tenant_context import get_tenant_id
from omni_api.services.data_scope_guard import DataScopeGuard
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.utc import utc_now
from omni_api.schemas.auth import TenantUserUpdate, UserCreate, UserRecord, UserUpdate
from omni_api.schemas.data_scope import DEFAULT_DATA_SCOPE
from omni_api.schemas.tenant import MEMBERSHIP_DEPARTED, RoleDataScopeItem
from omni_api.schemas.user_profile import UserProfile, UserProfileUpdate
from omni_api.services.identity_card import hash_id_card, mask_id_card, validate_id_card

logger = logging.getLogger(__name__)

_USER_SORT_FIELDS = {
    "id": "id",
    "username": "username",
    "display_name": "display_name",
    "created_at": "created_at",
    "enabled": "enabled",
}

_USER_TENANT_SORT_FIELDS = {
    "id": "u.id",
    "username": "u.username",
    "display_name": "u.display_name",
    "created_at": "u.created_at",
    "enabled": "u.enabled",
}

_USER_SELECT = (
    f"SELECT id, username, display_name, enabled, "
    f"created_at, updated_at, created_by, updated_by FROM {SYS_USER}"
)


class UserRepo:
    """用户 CRUD。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._tenants = TenantRepo(engine)

    def _roles(self, tenant_id: int | None = None) -> RoleRepo:
        return RoleRepo(self._engine, tenant_id=tenant_id)

    async def ensure_schema(self) -> None:
        """用户表由 ensure_sys_schema 统一创建。"""
        return

    async def count_users(self) -> int:
        sql = text(f"SELECT COUNT(*) FROM {SYS_USER}")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql)).fetchone()
        return int(row[0]) if row else 0

    async def _to_record(
        self,
        row: Sequence[Any],
        tenant_id: int | None = None,
        *,
        membership_status: int | None = None,
        dept_id: int | None = None,
        data_scope: int | None = None,
        custom_scopes: list | None = None,
        roles: list | None = None,
        use_request_tenant: bool = True,
    ) -> UserRecord:
        user_id = int(row[0])
        tid = tenant_id
        if use_request_tenant and tid is None:
            tid = get_tenant_id()
        role_list = roles if roles is not None else []
        bound_dept_id = dept_id
        bound_data_scope = data_scope
        bound_custom_scopes = custom_scopes if custom_scopes is not None else []
        status = membership_status
        if roles is None and tid is not None:
            binding = await self._tenants.get_user_binding(user_id, tid)
            if binding is not None:
                status = binding.membership_status
                bound_dept_id = binding.dept_id
                bound_data_scope = binding.data_scope
                bound_custom_scopes = binding.custom_scopes
                if binding.membership_status != MEMBERSHIP_DEPARTED:
                    role_list = await self._roles(tid).get_user_role_summaries(user_id, tid)
        return UserRecord(
            id=user_id,
            username=str(row[1]),
            display_name=str(row[2]),
            enabled=bool(row[3]),
            roles=role_list,
            dept_id=bound_dept_id,
            data_scope=bound_data_scope,
            custom_scopes=bound_custom_scopes,
            membership_status=status,
            created_at=row[4],
            updated_at=row[5],
            created_by=int(row[6]) if row[6] is not None else None,
            updated_by=int(row[7]) if row[7] is not None else None,
        )

    async def get_by_username(self, username: str) -> tuple[UserRecord, str] | None:
        sql = text(f"{_USER_SELECT} WHERE username = :u")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"u": username})).fetchone()
        if row is None:
            return None
        hash_sql = text(f"SELECT password_hash FROM {SYS_USER} WHERE id = :id")
        async with self._engine.connect() as conn:
            hrow = (await conn.execute(hash_sql, {"id": row[0]})).fetchone()
        assert hrow is not None
        return await self._to_record(row), str(hrow[0])

    async def get_by_id(self, user_id: int, tenant_id: int | None = None) -> UserRecord | None:
        sql = text(f"{_USER_SELECT} WHERE id = :id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": user_id})).fetchone()
        return await self._to_record(row, tenant_id) if row else None

    async def list_users(
        self,
        tenant_id: int | None = None,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[UserRecord]:
        """平台用户列表：不做数据范围裁剪。"""
        order = build_order_clause(
            sort_by,
            sort_order,
            _USER_SORT_FIELDS,
            default_field="id",
        )
        sql = text(f"{_USER_SELECT}{order}")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        result: list[UserRecord] = []
        for row in rows:
            result.append(await self._to_record(row, use_request_tenant=False))
        return result

    async def list_users_by_tenant(
        self,
        tenant_id: int,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[UserRecord]:
        """租户用户列表：固定应用数据权限。"""
        order = build_order_clause(
            sort_by,
            sort_order,
            _USER_TENANT_SORT_FIELDS,
            default_field="id",
        )
        scope_sql = ""
        scope_params: dict[str, object] = {"tid": tenant_id}
        guard = DataScopeGuard(self._engine, tenant_id=tenant_id)
        clause, p = await guard.tenant_user_clause()
        if clause:
            scope_sql = f" AND {clause}"
            scope_params.update(p)
        sql = text(
            f"SELECT u.id, u.username, u.display_name, u.enabled, "
            f"u.created_at, u.updated_at, u.created_by, u.updated_by, "
            f"ut.membership_status, ut.dept_id, ut.data_scope "
            f"FROM {SYS_USER} u "
            f"JOIN {SYS_USER_TENANT} ut ON ut.user_id=u.id "
            f"WHERE ut.tenant_id=:tid{scope_sql}{order}"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, scope_params)).fetchall()
        user_ids = [int(row[0]) for row in rows]
        role_map = await self._roles(tenant_id).list_user_role_summaries_batch(user_ids, tenant_id)
        result: list[UserRecord] = []
        for row in rows:
            uid = int(row[0])
            membership = int(row[8]) if row[8] is not None else None
            dept = int(row[9]) if row[9] is not None else None
            scope = int(row[10]) if row[10] is not None else None
            custom_scopes: list = []
            if scope == 4:
                from omni_api.data.mysql.user_data_scope_repo import UserDataScopeRepo

                custom_scopes = await UserDataScopeRepo(self._engine).get_scopes(tenant_id, uid)
            roles = role_map.get(uid, [])
            if membership == MEMBERSHIP_DEPARTED:
                roles = []
            result.append(
                await self._to_record(
                    row[:8],
                    tenant_id,
                    membership_status=membership,
                    dept_id=dept,
                    data_scope=scope,
                    custom_scopes=custom_scopes,
                    roles=roles,
                    use_request_tenant=False,
                )
            )
        return result

    async def is_user_in_tenant(self, user_id: int, tenant_id: int) -> bool:
        sql = text(
            f"SELECT 1 FROM {SYS_USER_TENANT} "
            f"WHERE user_id=:uid AND tenant_id=:tid LIMIT 1"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"uid": user_id, "tid": tenant_id})).fetchone()
        return row is not None

    async def is_user_active_in_tenant(self, user_id: int, tenant_id: int) -> bool:
        return await self._tenants.is_user_active_in_tenant(user_id, tenant_id)

    async def bind_user_to_tenant(
        self,
        user_id: int,
        tenant_id: int,
        *,
        dept_id: int,
        role_ids: list[int],
        data_scope: int = DEFAULT_DATA_SCOPE,
        custom_scopes: list[RoleDataScopeItem] | None = None,
    ) -> UserRecord:
        """将已有用户绑定到租户并设置部门、角色与数据权限。"""
        user = await self.get_by_id(user_id)
        if user is None:
            raise ValueError("用户不存在")
        if not user.enabled:
            raise ValueError("用户已禁用，无法绑定")
        await self._tenants.bind_user(
            user_id,
            tenant_id,
            dept_id=dept_id,
            data_scope=data_scope,
            custom_scopes=custom_scopes,
        )
        await self._roles(tenant_id).set_user_roles(user_id, role_ids, tenant_id)
        bound = await self.get_by_id(user_id, tenant_id)
        assert bound is not None
        return bound

    async def create_user(
        self,
        body: UserCreate,
        password_hash: str,
        *,
        actor_id: int | None = None,
        tenant_id: int | None = None,
        dept_id: int | None = None,
    ) -> UserRecord:
        actor = actor_id if actor_id is not None else get_actor_id()
        sql = text(
            f"INSERT INTO {SYS_USER} (username, password_hash, display_name, "
            f"created_by, updated_by) VALUES (:u, :ph, :dn, :cb, :ub)"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql,
                {
                    "u": body.username,
                    "ph": password_hash,
                    "dn": body.display_name,
                    "cb": actor,
                    "ub": actor,
                },
            )
            uid = int(result.lastrowid)
        tid = tenant_id or get_tenant_id()
        if tid is not None:
            effective_dept = body.dept_id if body.dept_id is not None else dept_id
            await self._tenants.bind_user(
                uid,
                tid,
                dept_id=effective_dept,
                data_scope=body.data_scope,
                custom_scopes=body.custom_scopes,
            )
            if body.role_ids:
                await self._roles(tid).set_user_roles(uid, body.role_ids, tid)
        user = await self.get_by_id(uid, tid)
        assert user is not None
        return user

    async def update_user(
        self,
        user_id: int,
        body: UserUpdate,
        *,
        password_hash: str | None = None,
        actor_id: int | None = None,
        tenant_id: int | None = None,
    ) -> UserRecord | None:
        current = await self.get_by_id(user_id, tenant_id)
        if current is None:
            return None
        display_name = body.display_name if body.display_name is not None else current.display_name
        enabled = body.enabled if body.enabled is not None else current.enabled
        actor = actor_id if actor_id is not None else get_actor_id()
        if password_hash is not None:
            sql = text(
                f"UPDATE {SYS_USER} SET display_name=:dn, enabled=:en, "
                f"password_hash=:ph, updated_by=:ub WHERE id=:id"
            )
            params = {
                "id": user_id,
                "dn": display_name,
                "en": int(enabled),
                "ph": password_hash,
                "ub": actor,
            }
        else:
            sql = text(
                f"UPDATE {SYS_USER} SET display_name=:dn, enabled=:en, "
                f"updated_by=:ub WHERE id=:id"
            )
            params = {
                "id": user_id,
                "dn": display_name,
                "en": int(enabled),
                "ub": actor,
            }
        async with self._engine.begin() as conn:
            await conn.execute(sql, params)
        tid = tenant_id or get_tenant_id()
        if tid is not None and body.role_ids is not None:
            await self._roles(tid).set_user_roles(user_id, body.role_ids, tid)
        if tid is not None and body.dept_id is not None:
            binding = await self._tenants.get_user_binding(user_id, tid)
            await self._tenants.bind_user(
                user_id,
                tid,
                dept_id=body.dept_id,
                data_scope=body.data_scope if body.data_scope is not None else (binding.data_scope if binding else DEFAULT_DATA_SCOPE),
                custom_scopes=body.custom_scopes if body.custom_scopes is not None else (binding.custom_scopes if binding else []),
            )
        elif tid is not None and (body.data_scope is not None or body.custom_scopes is not None):
            binding = await self._tenants.get_user_binding(user_id, tid)
            if binding is None:
                raise ValueError("用户未绑定当前租户")
            await self._tenants.apply_user_tenant_scope(
                user_id,
                tid,
                body.data_scope if body.data_scope is not None else binding.data_scope,
                body.custom_scopes if body.custom_scopes is not None else binding.custom_scopes,
            )
        return await self.get_by_id(user_id, tid)

    async def update_tenant_member(
        self,
        user_id: int,
        body: TenantUserUpdate,
        *,
        actor_id: int | None = None,
        tenant_id: int | None = None,
    ) -> UserRecord | None:
        """租户域更新：仅角色、部门、数据权限与启用状态，不改显示名。"""
        update = UserUpdate(
            enabled=body.enabled,
            role_ids=body.role_ids,
            dept_id=body.dept_id,
            data_scope=body.data_scope,
            custom_scopes=body.custom_scopes,
        )
        return await self.update_user(
            user_id,
            update,
            actor_id=actor_id,
            tenant_id=tenant_id,
        )

    async def get_profile(self, user_id: int) -> UserProfile | None:
        sql = text(
            f"SELECT id, username, display_name, avatar_url, real_name, "
            f"id_card_masked, identity_verified_at FROM {SYS_USER} WHERE id = :id"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": user_id})).fetchone()
        if row is None:
            return None
        verified_at = row[6]
        return UserProfile(
            id=int(row[0]),
            username=str(row[1]),
            display_name=str(row[2]),
            avatar_url=str(row[3]) if row[3] else None,
            real_name=str(row[4]) if row[4] else None,
            id_card_masked=str(row[5]) if row[5] else None,
            identity_verified=verified_at is not None,
            identity_verified_at=verified_at,
        )

    async def get_avatar_url(self, user_id: int) -> str | None:
        sql = text(f"SELECT avatar_url FROM {SYS_USER} WHERE id = :id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": user_id})).fetchone()
        if row is None or row[0] is None:
            return None
        return str(row[0])

    async def update_profile(
        self,
        user_id: int,
        body: UserProfileUpdate,
        *,
        actor_id: int | None = None,
    ) -> UserProfile | None:
        current = await self.get_profile(user_id)
        if current is None:
            return None
        display_name = (
            body.display_name if body.display_name is not None else current.display_name
        )
        avatar_url = body.avatar_url if body.avatar_url is not None else current.avatar_url
        actor = actor_id if actor_id is not None else get_actor_id()
        sql = text(
            f"UPDATE {SYS_USER} SET display_name=:dn, avatar_url=:av, "
            f"updated_by=:ub WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {"id": user_id, "dn": display_name, "av": avatar_url, "ub": actor},
            )
        return await self.get_profile(user_id)

    async def change_password(
        self,
        user_id: int,
        password_hash: str,
        *,
        actor_id: int | None = None,
    ) -> bool:
        actor = actor_id if actor_id is not None else get_actor_id()
        sql = text(
            f"UPDATE {SYS_USER} SET password_hash=:ph, updated_by=:ub WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql, {"id": user_id, "ph": password_hash, "ub": actor}
            )
        return result.rowcount > 0

    async def verify_identity(
        self,
        user_id: int,
        *,
        real_name: str,
        id_card: str,
        actor_id: int | None = None,
    ) -> UserProfile | None:
        current = await self.get_profile(user_id)
        if current is None:
            return None
        if current.identity_verified:
            raise ValueError("已完成实名认证，不可重复提交")
        card = validate_id_card(id_card)
        actor = actor_id if actor_id is not None else get_actor_id()
        now = utc_now()
        sql = text(
            f"UPDATE {SYS_USER} SET real_name=:rn, id_card_hash=:ih, "
            f"id_card_masked=:im, identity_verified_at=:iv, updated_by=:ub "
            f"WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "id": user_id,
                    "rn": real_name,
                    "ih": hash_id_card(card),
                    "im": mask_id_card(card),
                    "iv": now,
                    "ub": actor,
                },
            )
        return await self.get_profile(user_id)

    async def set_enabled(
        self, user_id: int, enabled: bool, *, actor_id: int | None = None
    ) -> UserRecord | None:
        actor = actor_id if actor_id is not None else get_actor_id()
        sql = text(f"UPDATE {SYS_USER} SET enabled=:en, updated_by=:ub WHERE id=:id")
        async with self._engine.begin() as conn:
            result = await conn.execute(
                sql, {"id": user_id, "en": int(enabled), "ub": actor}
            )
        if result.rowcount == 0:
            return None
        return await self.get_by_id(user_id)
