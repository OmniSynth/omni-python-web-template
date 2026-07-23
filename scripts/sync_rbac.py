#!/usr/bin/env python3
"""同步权限种子、平台系统角色；为全部租户开通业务分表并同步 admin 权限。

不涉及用户账号；机构/租户/用户初始化请使用 seed_admin.py。

用法：

  OMNI_PROFILE=local uv run scripts/sync_rbac.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from omni_api.config.settings import get_settings
from omni_api.auth.permission_seed import ROLE_ADMIN
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.role_repo import RoleRepo
from omni_api.data.mysql.sys_role_repo import SysRoleRepo
from omni_api.data.mysql.sys_schema import ensure_sys_schema
from omni_api.data.mysql.tenant_repo import TenantRepo
from omni_api.data.mysql.tenant_system_role_repo import (
    DEFAULT_SYSTEM_ROLE_BINDINGS,
    TenantSystemRoleRepo,
)
from omni_api.services.audit_service import AuditService
from omni_api.services.permission_service import PermissionService
from omni_api.services.tenant_provisioner import TenantProvisioner


async def _run() -> None:
    settings = get_settings()
    print(f"使用配置: OMNI_PROFILE={settings.profile}, mysql={settings.mysql.host}:{settings.mysql.port}")
    if settings.profile == "remote":
        print("提示: remote 配置为内网地址，本地开发请使用 OMNI_PROFILE=local")
    engine = mysql_engine()
    await ensure_sys_schema(engine)
    sys_role_repo = SysRoleRepo(engine)
    perms = PermissionService()

    await perms.ensure_platform_schema()
    added = await perms.sync_permissions()
    if added:
        print(f"已新增权限: {', '.join(added)}")
    else:
        print("权限种子已是最新，无新增项")

    await sys_role_repo.ensure_default_roles()
    sys_synced = await sys_role_repo.sync_admin_permissions()
    await AuditService().ensure_schema()

    tenants = await TenantRepo(engine).list_tenants()
    system_role_repo = TenantSystemRoleRepo(engine)
    await system_role_repo.ensure_schema()
    provisioner = TenantProvisioner(engine)
    tenant_synced_total = 0
    for tenant in tenants:
        await provisioner.provision(tenant.id)
        role_repo = RoleRepo(engine, tenant_id=tenant.id)
        bindings = await system_role_repo.list_role_codes(tenant.id)
        if not bindings:
            bindings = list(DEFAULT_SYSTEM_ROLE_BINDINGS)
        await role_repo.ensure_preset_roles(tenant.id, bindings)
        synced = await role_repo.sync_tenant_admin_permissions(tenant.id)
        tenant_synced_total += len(synced)

    sys_admin = await sys_role_repo.get_by_code(ROLE_ADMIN)
    if sys_admin is None:
        print("警告: 平台 admin 角色不存在，请先执行 seed_admin.py")
        return

    if tenant_synced_total:
        print(f"各租户 admin 共补齐 {tenant_synced_total} 项权限")

    if sys_synced:
        print(f"平台 admin 已补齐 {len(sys_synced)} 项权限")
    print(f"平台 admin 当前共 {len(sys_admin.permissions)} 项权限")
    print(f"已处理 {len(tenants)} 个租户（业务分表已开通/校验）")

    if added or tenant_synced_total or sys_synced:
        print("提示: 已登录用户需刷新页面（或重新登录）以更新会话中的权限列表")


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
