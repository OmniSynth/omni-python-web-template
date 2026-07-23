"""租户业务表名解析。"""

from __future__ import annotations

# 租户开通时需创建的物理分表基名（不含 t_biz_ 前缀与 _{tenant_id} 后缀）
BIZ_TABLE_BASES: tuple[str, ...] = (
    "dept",
    "roles",
    "role_permissions",
    "user_roles",
    "role_data_scope",
    "user_data_scope",
    "dev_param_group",
    "dev_params",
)

# 系统级共享表
SYS_ORGANIZATION = "t_sys_organization"
SYS_ORG_TENANT = "t_sys_org_tenant"
SYS_TENANT = "t_sys_tenant"
SYS_TENANT_SYSTEM_ROLE = "t_sys_tenant_system_role"
SYS_USER = "t_sys_user"
SYS_USER_TENANT = "t_sys_user_tenant"
SYS_ROLES = "t_sys_roles"
SYS_ROLE_PERMISSIONS = "t_sys_role_permissions"
SYS_USER_ROLES = "t_sys_user_roles"
SYS_PERMISSIONS = "t_sys_permissions"
SYS_PERMISSION_API_BINDINGS = "t_sys_permission_api_bindings"
SYS_PERMISSION_API_ROUTES = "t_sys_permission_api_routes"
SYS_AUDIT_REQUEST_LOGS = "t_sys_audit_request_logs"
SYS_AUDIT_OPERATION_LOGS = "t_sys_audit_operation_logs"
SYS_AUDIT_SLOW_SQL_LOGS = "t_sys_audit_slow_sql_logs"
SYS_USER_TABLE_PREFERENCE = "t_sys_user_table_preference"
SYS_SCHEDULED_JOB = "t_sys_scheduled_job"


def biz_table(base: str, tenant_id: int) -> str:
    """返回租户业务物理表名，如 t_biz_dept_{tenant_id}。"""
    if base not in BIZ_TABLE_BASES:
        raise ValueError(f"未知业务表基名: {base}")
    return f"t_biz_{base}_{tenant_id}"
