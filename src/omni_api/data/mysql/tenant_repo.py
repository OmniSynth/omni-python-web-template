"""租户 MySQL 仓储。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.actor import get_actor_id
from omni_api.data.mysql.biz_table import (
    SYS_TENANT,
    SYS_USER,
    SYS_USER_TENANT,
)
from omni_api.data.mysql.list_sort import SortOrder, build_order_clause
from omni_api.data.mysql.org_repo import OrgRepo
from omni_api.schemas.data_scope import DATA_SCOPE_SELF, DEFAULT_DATA_SCOPE
from omni_api.schemas.tenant import (
    BoundTenantInfo,
    MEMBERSHIP_ACTIVE,
    MEMBERSHIP_DEPARTED,
    RoleDataScopeItem,
    TenantAdminUserOption,
    TenantCreate,
    TenantRecord,
    TenantUpdate,
    UserTenantBinding,
    UserTenantBindingInput,
    UserTenantConfigItem,
)
from omni_api.services.user_data_scope import normalize_user_data_scope
from omni_api.services.tenant_code import allocate_tenant_code, normalize_region
from omni_api.services.tenant_provisioner import TenantProvisioner
from omni_api.services.phone import normalize_phone

_TENANT_SORT_FIELDS = {
    "id": "t.id",
    "code": "t.code",
    "name": "t.name",
    "phone": "t.phone",
    "created_at": "t.created_at",
    "enabled": "t.enabled",
}

_TENANT_SELECT = (
    f"SELECT t.id, t.code, t.name, t.province, t.city, t.district, t.region, t.phone, "
    f"t.admin_user_id, u.username, u.display_name, t.enabled, t.created_at, t.updated_at "
    f"FROM {SYS_TENANT} t "
    f"LEFT JOIN {SYS_USER} u ON u.id = t.admin_user_id"
)


def _row_to_tenant(row: Sequence[Any]) -> TenantRecord:
    return TenantRecord(
        id=int(row[0]),
        code=str(row[1]),
        name=str(row[2]),
        province=str(row[3]),
        city=str(row[4]),
        district=str(row[5]),
        region=str(row[6]),
        phone=str(row[7]),
        admin_user_id=int(row[8]) if row[8] is not None else None,
        admin_username=str(row[9]) if row[9] is not None else None,
        admin_display_name=str(row[10]) if row[10] is not None else None,
        enabled=bool(row[11]),
        created_at=row[12],
        updated_at=row[13],
    )


class TenantRepo:
    """租户 CRUD 与用户-租户绑定。"""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._provisioner = TenantProvisioner(engine)

    async def list_tenants(
        self,
        *,
        sort_by: str | None = None,
        sort_order: SortOrder | None = None,
    ) -> list[TenantRecord]:
        """平台租户列表：不做数据范围裁剪。"""
        order = build_order_clause(
            sort_by,
            sort_order,
            _TENANT_SORT_FIELDS,
            default_field="id",
        )
        sql = text(f"{_TENANT_SELECT}{order}")
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql)).fetchall()
        return [_row_to_tenant(r) for r in rows]

    async def get_by_id(self, tenant_id: int) -> TenantRecord | None:
        sql = text(f"{_TENANT_SELECT} WHERE t.id=:id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": tenant_id})).fetchone()
        return _row_to_tenant(row) if row else None

    async def get_by_code(self, code: str) -> TenantRecord | None:
        sql = text(f"{_TENANT_SELECT} WHERE t.code=:code")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"code": code})).fetchone()
        return _row_to_tenant(row) if row else None

    async def get_admin_user_id(self, tenant_id: int) -> int | None:
        sql = text(f"SELECT admin_user_id FROM {SYS_TENANT} WHERE id=:id")
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"id": tenant_id})).fetchone()
        if row is None or row[0] is None:
            return None
        return int(row[0])

    async def set_admin_user_id(self, tenant_id: int, user_id: int) -> None:
        actor = get_actor_id()
        sql = text(
            f"UPDATE {SYS_TENANT} SET admin_user_id=:uid, updated_by=:ub WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(sql, {"id": tenant_id, "uid": user_id, "ub": actor})

    async def list_admin_user_options(
        self, tenant_id: int | None = None
    ) -> list[TenantAdminUserOption]:
        """管理员候选：编辑时优先已绑定租户的用户，并附带全部启用用户。"""
        bound_ids: set[int] = set()
        if tenant_id is not None:
            sql = text(
                f"SELECT user_id FROM {SYS_USER_TENANT} "
                f"WHERE tenant_id=:tid AND membership_status=:ms"
            )
            async with self._engine.connect() as conn:
                rows = (await conn.execute(sql, {"tid": tenant_id, "ms": MEMBERSHIP_ACTIVE})).fetchall()
            bound_ids = {int(r[0]) for r in rows}
        user_sql = text(
            f"SELECT id, username, display_name FROM {SYS_USER} "
            f"WHERE enabled=1 ORDER BY id ASC"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(user_sql)).fetchall()
        return [
            TenantAdminUserOption(
                id=int(r[0]),
                username=str(r[1]),
                display_name=str(r[2]),
                bound=(int(r[0]) in bound_ids),
            )
            for r in rows
        ]

    async def create(self, body: TenantCreate) -> TenantRecord:
        org = await OrgRepo(self._engine).get_by_id(body.org_id)
        if org is None:
            raise ValueError("机构不存在")
        region = normalize_region(body.region)
        phone = normalize_phone(body.phone)
        actor = get_actor_id()
        async with self._engine.begin() as conn:
            code = await allocate_tenant_code(conn, org.org_type, region)
            result = await conn.execute(
                text(
                    f"INSERT INTO {SYS_TENANT} "
                    f"(code, name, province, city, district, region, phone, enabled, "
                    f"created_by, updated_by) "
                    f"VALUES (:code, :name, :prov, :city, :dist, :region, :phone, :en, :cb, :ub)"
                ),
                {
                    "code": code,
                    "name": body.name,
                    "prov": body.province,
                    "city": body.city,
                    "dist": body.district,
                    "region": region,
                    "phone": phone,
                    "en": int(body.enabled),
                    "cb": actor,
                    "ub": actor,
                },
            )
            tenant_id = int(result.lastrowid)
            await conn.execute(
                text(
                    "INSERT IGNORE INTO t_sys_org_tenant "
                    "(org_id, tenant_id, created_by, updated_by) "
                    "VALUES (:oid, :tid, :cb, :ub)"
                ),
                {"oid": body.org_id, "tid": tenant_id, "cb": actor, "ub": actor},
            )
        await self._provisioner.provision(tenant_id)
        tenant = await self.get_by_id(tenant_id)
        assert tenant is not None
        return tenant

    async def update(self, tenant_id: int, body: TenantUpdate) -> TenantRecord | None:
        current = await self.get_by_id(tenant_id)
        if current is None:
            return None
        name = body.name if body.name is not None else current.name
        province = body.province if body.province is not None else current.province
        city = body.city if body.city is not None else current.city
        district = body.district if body.district is not None else current.district
        enabled = body.enabled if body.enabled is not None else current.enabled
        region = (
            normalize_region(body.region) if body.region is not None else current.region
        )
        phone = current.phone
        if body.phone is not None:
            phone = normalize_phone(body.phone.strip())
        actor = get_actor_id()
        sql = text(
            f"UPDATE {SYS_TENANT} SET name=:name, province=:prov, city=:city, "
            f"district=:dist, region=:region, phone=:phone, enabled=:en, updated_by=:ub "
            f"WHERE id=:id"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "id": tenant_id,
                    "name": name,
                    "prov": province,
                    "city": city,
                    "dist": district,
                    "region": region,
                    "phone": phone,
                    "en": int(enabled),
                    "ub": actor,
                },
            )
        return await self.get_by_id(tenant_id)

    async def list_user_bindings(self, user_id: int) -> list[UserTenantBinding]:
        from omni_api.data.mysql.user_data_scope_repo import UserDataScopeRepo

        sql = text(
            f"SELECT user_id, tenant_id, dept_id, data_scope, last_login_at, membership_status "
            f"FROM {SYS_USER_TENANT} "
            f"WHERE user_id=:uid AND membership_status=:ms "
            f"ORDER BY last_login_at DESC, tenant_id"
        )
        async with self._engine.connect() as conn:
            rows = (await conn.execute(sql, {"uid": user_id, "ms": MEMBERSHIP_ACTIVE})).fetchall()
        scope_repo = UserDataScopeRepo(self._engine)
        result: list[UserTenantBinding] = []
        for row in rows:
            tenant_id = int(row[1])
            data_scope = int(row[3]) if row[3] is not None else DEFAULT_DATA_SCOPE
            custom_scopes: list[RoleDataScopeItem] = []
            if data_scope == 4:
                custom_scopes = await scope_repo.get_scopes(tenant_id, user_id)
            result.append(
                UserTenantBinding(
                    user_id=int(row[0]),
                    tenant_id=tenant_id,
                    dept_id=int(row[2]) if row[2] is not None else None,
                    data_scope=data_scope,
                    custom_scopes=custom_scopes,
                    last_login_at=row[4],
                    membership_status=int(row[5]) if row[5] is not None else MEMBERSHIP_ACTIVE,
                )
            )
        return result

    async def get_user_binding(
        self, user_id: int, tenant_id: int
    ) -> UserTenantBinding | None:
        from omni_api.data.mysql.user_data_scope_repo import UserDataScopeRepo

        sql = text(
            f"SELECT user_id, tenant_id, dept_id, data_scope, last_login_at, membership_status "
            f"FROM {SYS_USER_TENANT} WHERE user_id=:uid AND tenant_id=:tid"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"uid": user_id, "tid": tenant_id})).fetchone()
        if row is None:
            return None
        data_scope = int(row[3]) if row[3] is not None else DEFAULT_DATA_SCOPE
        custom_scopes: list[RoleDataScopeItem] = []
        if data_scope == 4:
            custom_scopes = await UserDataScopeRepo(self._engine).get_scopes(tenant_id, user_id)
        return UserTenantBinding(
            user_id=int(row[0]),
            tenant_id=int(row[1]),
            dept_id=int(row[2]) if row[2] is not None else None,
            data_scope=data_scope,
            custom_scopes=custom_scopes,
            last_login_at=row[4],
            membership_status=int(row[5]) if row[5] is not None else MEMBERSHIP_ACTIVE,
        )

    async def is_user_active_in_tenant(self, user_id: int, tenant_id: int) -> bool:
        sql = text(
            f"SELECT 1 FROM {SYS_USER_TENANT} "
            f"WHERE user_id=:uid AND tenant_id=:tid AND membership_status=:ms LIMIT 1"
        )
        async with self._engine.connect() as conn:
            row = (
                await conn.execute(
                    sql, {"uid": user_id, "tid": tenant_id, "ms": MEMBERSHIP_ACTIVE}
                )
            ).fetchone()
        return row is not None

    async def apply_user_tenant_scope(
        self,
        user_id: int,
        tenant_id: int,
        data_scope: int,
        custom_scopes: list[RoleDataScopeItem] | None,
    ) -> None:
        from omni_api.data.mysql.user_data_scope_repo import UserDataScopeRepo

        normalized_scope, normalized_custom = normalize_user_data_scope(
            data_scope, custom_scopes
        )
        actor = get_actor_id()
        sql = text(
            f"UPDATE {SYS_USER_TENANT} SET data_scope=:ds, updated_by=:ub "
            f"WHERE user_id=:uid AND tenant_id=:tid"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {"uid": user_id, "tid": tenant_id, "ds": normalized_scope, "ub": actor},
            )
        await UserDataScopeRepo(self._engine).set_scopes(
            tenant_id,
            user_id,
            normalized_custom,
        )

    async def bind_user(
        self,
        user_id: int,
        tenant_id: int,
        *,
        dept_id: int | None = None,
        data_scope: int = DEFAULT_DATA_SCOPE,
        custom_scopes: list[RoleDataScopeItem] | None = None,
    ) -> None:
        dept_id = await self._require_valid_dept(tenant_id, dept_id)
        normalized_scope, normalized_custom = normalize_user_data_scope(
            data_scope, custom_scopes
        )
        actor = get_actor_id()
        sql = text(
            f"INSERT INTO {SYS_USER_TENANT} "
            f"(user_id, tenant_id, dept_id, data_scope, membership_status, created_by, updated_by) "
            f"VALUES (:uid, :tid, :did, :ds, :ms, :cb, :ub) "
            f"ON DUPLICATE KEY UPDATE dept_id=:did, data_scope=:ds, "
            f"membership_status=:ms, updated_by=:ub"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "uid": user_id,
                    "tid": tenant_id,
                    "did": dept_id,
                    "ds": normalized_scope,
                    "ms": MEMBERSHIP_ACTIVE,
                    "cb": actor,
                    "ub": actor,
                },
            )
        from omni_api.data.mysql.user_data_scope_repo import UserDataScopeRepo

        await UserDataScopeRepo(self._engine).set_scopes(
            tenant_id, user_id, normalized_custom
        )

    async def update_last_login(self, user_id: int, tenant_id: int) -> None:
        from omni_api.data.mysql.utc import utc_now

        actor = get_actor_id()
        sql = text(
            f"UPDATE {SYS_USER_TENANT} SET last_login_at=:ts, updated_by=:ub "
            f"WHERE user_id=:uid AND tenant_id=:tid"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {"uid": user_id, "tid": tenant_id, "ts": utc_now(), "ub": actor},
            )

    async def list_bound_tenant_infos(
        self, user_id: int, tenant_id: int | None = None
    ) -> list[BoundTenantInfo]:
        from omni_api.data.mysql.dept_repo import DeptRepo

        bindings = await self.list_user_bindings(user_id)
        if tenant_id is not None:
            bindings = [b for b in bindings if b.tenant_id == tenant_id]
        orgs = await OrgRepo(self._engine).list_primary_orgs_by_tenant()
        result: list[BoundTenantInfo] = []
        dept_repo = DeptRepo(self._engine)
        for b in bindings:
            tenant = await self.get_by_id(b.tenant_id)
            if tenant is None or not tenant.enabled:
                continue
            dept_name: str | None = None
            if b.dept_id is not None:
                dept = await dept_repo.get_by_id(b.tenant_id, b.dept_id)
                dept_name = dept.name if dept else None
            org = orgs.get(tenant.id)
            result.append(
                BoundTenantInfo(
                    id=tenant.id,
                    name=tenant.name,
                    code=tenant.code,
                    province=tenant.province,
                    city=tenant.city,
                    district=tenant.district,
                    org_name=org.name if org else "",
                    org_credit_code=org.credit_code if org else "",
                    dept_id=b.dept_id,
                    dept_name=dept_name,
                )
            )
        return result

    async def get_user_dept_id(self, user_id: int, tenant_id: int) -> int | None:
        sql = text(
            f"SELECT dept_id FROM {SYS_USER_TENANT} "
            f"WHERE user_id=:uid AND tenant_id=:tid"
        )
        async with self._engine.connect() as conn:
            row = (await conn.execute(sql, {"uid": user_id, "tid": tenant_id})).fetchone()
        return int(row[0]) if row and row[0] is not None else None

    async def depart_user(self, user_id: int, tenant_id: int) -> None:
        from omni_api.data.mysql.role_repo import RoleRepo
        from omni_api.data.mysql.user_data_scope_repo import UserDataScopeRepo

        binding = await self.get_user_binding(user_id, tenant_id)
        if binding is None:
            raise ValueError("用户未绑定当前租户")
        if binding.membership_status == MEMBERSHIP_DEPARTED:
            raise ValueError("用户已离职")
        await RoleRepo(self._engine, tenant_id=tenant_id).set_user_roles(
            user_id, [], tenant_id
        )
        await UserDataScopeRepo(self._engine).set_scopes(tenant_id, user_id, [])
        actor = get_actor_id()
        sql = text(
            f"UPDATE {SYS_USER_TENANT} SET membership_status=:ms, data_scope=:ds, updated_by=:ub "
            f"WHERE user_id=:uid AND tenant_id=:tid"
        )
        async with self._engine.begin() as conn:
            await conn.execute(
                sql,
                {
                    "uid": user_id,
                    "tid": tenant_id,
                    "ms": MEMBERSHIP_DEPARTED,
                    "ds": DATA_SCOPE_SELF,
                    "ub": actor,
                },
            )

    async def unbind_user(self, user_id: int, tenant_id: int) -> None:
        await self.depart_user(user_id, tenant_id)

    async def list_user_tenant_config(self, user_id: int) -> list[UserTenantConfigItem]:
        from omni_api.data.mysql.dept_repo import DeptRepo

        tenants = await self.list_tenants()
        bindings = {b.tenant_id: b for b in await self.list_user_bindings(user_id)}
        orgs = await OrgRepo(self._engine).list_primary_orgs_by_tenant()
        dept_repo = DeptRepo(self._engine)
        result: list[UserTenantConfigItem] = []
        for tenant in tenants:
            binding = bindings.get(tenant.id)
            dept_id = binding.dept_id if binding else None
            dept_name: str | None = None
            data_scope = binding.data_scope if binding else DEFAULT_DATA_SCOPE
            custom_scopes = binding.custom_scopes if binding else []
            if dept_id is not None:
                dept = await dept_repo.get_by_id(tenant.id, dept_id)
                dept_name = dept.name if dept else None
            org = orgs.get(tenant.id)
            result.append(
                UserTenantConfigItem(
                    tenant_id=tenant.id,
                    tenant_name=tenant.name,
                    tenant_code=tenant.code,
                    province=tenant.province,
                    city=tenant.city,
                    district=tenant.district,
                    org_name=org.name if org else "",
                    org_credit_code=org.credit_code if org else "",
                    tenant_enabled=tenant.enabled,
                    bound=binding is not None,
                    dept_id=dept_id,
                    dept_name=dept_name,
                    data_scope=data_scope,
                    custom_scopes=custom_scopes,
                )
            )
        return result

    async def list_tenant_config_template(
        self, default_bound_tenant_id: int | None = None
    ) -> list[UserTenantConfigItem]:
        """新建用户时的租户选项（默认仅勾选当前租户）。"""
        tenants = await self.list_tenants()
        orgs = await OrgRepo(self._engine).list_primary_orgs_by_tenant()
        result: list[UserTenantConfigItem] = []
        for tenant in tenants:
            org = orgs.get(tenant.id)
            result.append(
                UserTenantConfigItem(
                    tenant_id=tenant.id,
                    tenant_name=tenant.name,
                    tenant_code=tenant.code,
                    province=tenant.province,
                    city=tenant.city,
                    district=tenant.district,
                    org_name=org.name if org else "",
                    org_credit_code=org.credit_code if org else "",
                    tenant_enabled=tenant.enabled,
                    bound=(
                        default_bound_tenant_id is not None
                        and tenant.id == default_bound_tenant_id
                    ),
                    dept_id=None,
                    dept_name=None,
                    data_scope=DEFAULT_DATA_SCOPE,
                    custom_scopes=[],
                )
            )
        return result

    async def set_user_tenant_bindings(
        self,
        user_id: int,
        bindings: list[UserTenantBindingInput],
    ) -> list[UserTenantConfigItem]:
        if not bindings:
            raise ValueError("至少保留一个租户绑定")
        current_ids = {b.tenant_id for b in await self.list_user_bindings(user_id)}
        new_ids = {item.tenant_id for item in bindings}
        for tenant_id in current_ids - new_ids:
            await self.unbind_user(user_id, tenant_id)
        for item in bindings:
            tenant = await self.get_by_id(item.tenant_id)
            if tenant is None:
                raise ValueError(f"租户不存在: {item.tenant_id}")
            await self.bind_user(
                user_id,
                item.tenant_id,
                dept_id=item.dept_id,
                data_scope=item.data_scope,
                custom_scopes=item.custom_scopes,
            )
        return await self.list_user_tenant_config(user_id)

    async def _require_valid_dept(self, tenant_id: int, dept_id: int | None) -> int:
        """校验部门 ID 必填且属于租户。"""
        if dept_id is None or dept_id <= 0:
            raise ValueError("须指定部门")
        from omni_api.data.mysql.dept_repo import DeptRepo

        dept = await DeptRepo(self._engine).get_by_id(tenant_id, dept_id)
        if dept is None:
            raise ValueError("部门不存在或不属于当前租户")
        return dept_id
