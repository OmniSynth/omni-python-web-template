"""用户有效权限：租户角色 + 平台系统角色并集。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.permission_repo import PermissionRepo
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.sys_role_repo import SysRoleRepo


async def resolve_user_permissions(
    engine: AsyncEngine,
    user_id: int,
    tenant_id: int | None,
    *,
    expand_nav: bool = True,
) -> tuple[list[str], set[str]]:
    """返回 (角色 code 列表, 权限码集合)。合并租户内角色与平台系统角色。"""
    perm_repo = PermissionRepo(engine)
    sys_repo = SysRoleRepo(engine, permission_repo=perm_repo)

    role_codes = list(await sys_repo.get_user_role_codes(user_id))
    perms = await sys_repo.get_user_permissions(user_id)

    if tenant_id is not None:
        role_repo = RoleRepo(engine, tenant_id=tenant_id, permission_repo=perm_repo)
        tenant_roles = await role_repo.get_user_role_codes(user_id, tenant_id)
        tenant_perms = await role_repo.get_user_permissions(user_id, tenant_id)
        role_codes = sorted(set(role_codes) | set(tenant_roles))
        perms |= tenant_perms

    if expand_nav:
        perms = await perm_repo.expand_nav_codes(perms)

    return role_codes, perms
