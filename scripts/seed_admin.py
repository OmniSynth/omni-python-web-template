#!/usr/bin/env python3
"""初始化 RBAC，并通过新建机构开通租户；首个平台管理员绑定租户管理员账号。

用法：

  OMNI_PROFILE=local uv run scripts/seed_admin.py

职责：
- 建表、同步权限种子与平台 admin 角色
- 若已存在平台 admin 角色用户，则不再创建/绑定平台管理员
- 幂等创建默认机构（信用代码去重）；不存在时走机构一键开通链路
- 首次开通时将租户管理员同时绑定为平台 admin（t_sys_user_roles）
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from omni_api.auth.permissions import ROLE_ADMIN
from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.org_repo import OrgRepo
from omni_api.data.mysql.permission_repo import PermissionRepo
from omni_api.data.mysql.sys_role_repo import SysRoleRepo
from omni_api.data.mysql.sys_schema import ensure_sys_schema
from omni_api.schemas.tenant import OrganizationCreate
from omni_api.services.audit_service import AuditService
from omni_api.services.org_onboarding import OrgOnboardingService

# 默认开通机构（可通过环境或后续扩展 CLI 覆盖）
DEFAULT_ORG = OrganizationCreate(
    name="杭州临安创容云信息咨询工作室",
    org_type="company",
    credit_code="92330185MADW4W770E",
    phone="13272272602",
    province="浙江省",
    city="杭州市",
    district="临安区",
    region="311325",
)


async def _ensure_platform_schemas(engine) -> None:
    await ensure_sys_schema(engine)
    perm_repo = PermissionRepo(engine)
    await perm_repo.ensure_schema()
    await perm_repo.ensure_default_permissions()
    await perm_repo.sync_permissions()
    sys_roles = SysRoleRepo(engine)
    await sys_roles.ensure_schema()
    await sys_roles.ensure_default_roles()
    await sys_roles.sync_admin_permissions()
    await AuditService().ensure_schema()


async def _run() -> None:
    engine = mysql_engine()
    await _ensure_platform_schemas(engine)

    sys_role_repo = SysRoleRepo(engine)
    org_repo = OrgRepo(engine)
    existing_sys_admins = await sys_role_repo.list_users_with_role(ROLE_ADMIN)

    existing_org = await org_repo.get_by_credit_code(DEFAULT_ORG.credit_code)
    if existing_org is not None:
        print(
            f"机构已存在: {existing_org.name} "
            f"(id={existing_org.id}, phone={existing_org.phone})"
        )
        if existing_sys_admins:
            names = ", ".join(u for _, u in existing_sys_admins)
            print(f"平台管理员已存在 ({names})，跳过创建")
        return

    if existing_sys_admins:
        names = ", ".join(u for _, u in existing_sys_admins)
        print(f"平台管理员已存在 ({names})，仅创建机构与租户，不再绑定平台 admin")
        result = await OrgOnboardingService(engine).create_with_tenant(DEFAULT_ORG)
        print(
            f"已创建机构 id={result.organization.id}，"
            f"租户 id={result.tenant.id} code={result.tenant.code}"
        )
        if result.admin_credentials is not None:
            cred = result.admin_credentials
            print(f"租户管理员: {cred.username} / {cred.password}（请妥善保存）")
        elif result.tenant.admin_user_id is not None:
            print(f"租户管理员: user_id={result.tenant.admin_user_id}（匹配已有用户）")
        return

    result = await OrgOnboardingService(engine).create_with_tenant(DEFAULT_ORG)
    admin_user_id = result.tenant.admin_user_id
    if admin_user_id is None:
        raise RuntimeError("机构开通后未产生租户管理员")
    await sys_role_repo.assign_role_by_code(admin_user_id, ROLE_ADMIN)

    print(
        f"已创建机构 id={result.organization.id}，"
        f"租户 id={result.tenant.id} code={result.tenant.code}"
    )
    print(f"已绑定平台 admin: user_id={admin_user_id}")
    if result.admin_credentials is not None:
        cred = result.admin_credentials
        print(f"登录账号: {cred.username}")
        print(f"初始密码: {cred.password}（请妥善保存）")
    else:
        print(f"登录账号: {result.tenant.admin_username or DEFAULT_ORG.phone}（匹配已有用户）")


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
