"""系统级表 DDL。"""

from __future__ import annotations

from omni_api.data.mysql.audit import AUDIT_COLUMN_DEFS
from omni_api.data.mysql.biz_table import (
    SYS_ORG_TENANT,
    SYS_ORGANIZATION,
    SYS_PERMISSION_API_BINDINGS,
    SYS_PERMISSION_API_ROUTES,
    SYS_PERMISSIONS,
    SYS_ROLE_PERMISSIONS,
    SYS_ROLES,
    SYS_SCHEDULED_JOB,
    SYS_TENANT,
    SYS_TENANT_SYSTEM_ROLE,
    SYS_USER,
    SYS_USER_ROLES,
    SYS_USER_TABLE_PREFERENCE,
    SYS_USER_TENANT,
)
from omni_api.data.mysql.ddl_comment import (
    DATA_SCOPE_ENUM,
    ENABLED_FLAG,
    ID_PK,
    MEMBERSHIP_STATUS_ENUM,
    PERMISSION_KIND_ENUM,
    ROLE_TYPE_ENUM,
    cmt,
)


def create_organization_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_ORGANIZATION} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    name VARCHAR(128) NOT NULL{cmt("机构名称")},
    org_type VARCHAR(32) NOT NULL DEFAULT 'company'{cmt("机构类型 company企业")},
    credit_code VARCHAR(18) NOT NULL DEFAULT ''{cmt("统一社会信用代码")},
    phone VARCHAR(20) NOT NULL DEFAULT ''{cmt("联系电话")},
    enabled TINYINT NOT NULL DEFAULT 1{ENABLED_FLAG},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_org_phone (phone),
    UNIQUE KEY uq_sys_org_credit_code (credit_code)
);
"""


def create_org_tenant_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_ORG_TENANT} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    org_id BIGINT NOT NULL{cmt("机构ID")},
    tenant_id BIGINT NOT NULL{cmt("租户ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_org_tenant (org_id, tenant_id),
    FOREIGN KEY (org_id) REFERENCES {SYS_ORGANIZATION}(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES {SYS_TENANT}(id) ON DELETE CASCADE
);
"""


def create_tenant_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_TENANT} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    code VARCHAR(64) NOT NULL UNIQUE{cmt("租户编码")},
    name VARCHAR(128) NOT NULL{cmt("租户名称")},
    province VARCHAR(64) NOT NULL DEFAULT ''{cmt("省")},
    city VARCHAR(64) NOT NULL DEFAULT ''{cmt("市")},
    district VARCHAR(64) NOT NULL DEFAULT ''{cmt("区")},
    region VARCHAR(16) NOT NULL DEFAULT ''{cmt("区域编码")},
    phone VARCHAR(20) NOT NULL DEFAULT ''{cmt("联系电话")},
    admin_user_id BIGINT NULL{cmt("管理员用户ID")},
    enabled TINYINT NOT NULL DEFAULT 1{ENABLED_FLAG},
    expires_at DATETIME(6) NULL{cmt("套餐到期时间(UTC naive)；空为永不过期")},
    {AUDIT_COLUMN_DEFS.strip()},
    KEY idx_sys_tenant_region (region),
    KEY idx_sys_tenant_admin (admin_user_id),
    KEY idx_sys_tenant_expiry (expires_at, enabled)
);
"""


def create_tenant_system_role_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_TENANT_SYSTEM_ROLE} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    tenant_id BIGINT NOT NULL{cmt("租户ID")},
    role_code VARCHAR(32) NOT NULL{cmt("预置角色编码")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_tenant_system_role (tenant_id, role_code),
    FOREIGN KEY (tenant_id) REFERENCES {SYS_TENANT}(id) ON DELETE CASCADE
);
"""


def create_user_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_USER} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    username VARCHAR(64) NOT NULL UNIQUE{cmt("登录名")},
    password_hash VARCHAR(255) NOT NULL{cmt("密码哈希")},
    display_name VARCHAR(128) NOT NULL DEFAULT ''{cmt("显示名")},
    avatar_url VARCHAR(512) NULL{cmt("头像URL")},
    real_name VARCHAR(64) NULL{cmt("真实姓名")},
    id_card_hash VARCHAR(64) NULL{cmt("身份证号哈希")},
    id_card_masked VARCHAR(32) NULL{cmt("身份证号脱敏")},
    identity_verified_at DATETIME(6) NULL{cmt("实名认证时间(UTC)")},
    enabled TINYINT NOT NULL DEFAULT 1{ENABLED_FLAG},
    {AUDIT_COLUMN_DEFS.strip()},
    KEY idx_sys_user_enabled (enabled)
);
"""


def create_user_tenant_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_USER_TENANT} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    user_id BIGINT NOT NULL{cmt("用户ID")},
    tenant_id BIGINT NOT NULL{cmt("租户ID")},
    dept_id BIGINT NULL{cmt("部门ID")},
    data_scope TINYINT NOT NULL DEFAULT 3{cmt(DATA_SCOPE_ENUM)},
    membership_status TINYINT NOT NULL DEFAULT 1{cmt(MEMBERSHIP_STATUS_ENUM)},
    last_login_at DATETIME(6) NULL{cmt("最近登录时间(UTC)")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_user_tenant (user_id, tenant_id),
    FOREIGN KEY (user_id) REFERENCES {SYS_USER}(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES {SYS_TENANT}(id) ON DELETE CASCADE
);
"""


def create_sys_roles_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_ROLES} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    code VARCHAR(64) NOT NULL{cmt("角色编码")},
    name VARCHAR(128) NOT NULL{cmt("角色名称")},
    description VARCHAR(512) NOT NULL DEFAULT ''{cmt("描述")},
    role_type VARCHAR(16) NOT NULL DEFAULT 'tenant'{cmt(ROLE_TYPE_ENUM)},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_role_code (code)
);

CREATE TABLE IF NOT EXISTS {SYS_ROLE_PERMISSIONS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    role_id BIGINT NOT NULL{cmt("角色ID")},
    permission_code VARCHAR(128) NOT NULL{cmt("权限编码")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_role_permission (role_id, permission_code),
    FOREIGN KEY (role_id) REFERENCES {SYS_ROLES}(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS {SYS_USER_ROLES} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    user_id BIGINT NOT NULL{cmt("用户ID")},
    role_id BIGINT NOT NULL{cmt("角色ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_user_role (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES {SYS_USER}(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES {SYS_ROLES}(id) ON DELETE CASCADE
);
"""


def create_permissions_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_PERMISSIONS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    code VARCHAR(128) NOT NULL UNIQUE{cmt("权限编码")},
    name VARCHAR(128) NOT NULL{cmt("权限名称")},
    kind VARCHAR(16) NOT NULL{cmt(PERMISSION_KIND_ENUM)},
    parent_id BIGINT NULL{cmt("父权限ID")},
    sort_order INT NOT NULL DEFAULT 0{cmt("排序")},
    enabled TINYINT NOT NULL DEFAULT 1{ENABLED_FLAG},
    route_path VARCHAR(255) NULL{cmt("前端路由")},
    component_key VARCHAR(64) NULL{cmt("前端组件键")},
    api_method VARCHAR(16) NULL{cmt("HTTP方法")},
    api_path_pattern VARCHAR(512) NULL{cmt("API路径模式")},
    description VARCHAR(512) NOT NULL DEFAULT ''{cmt("描述")},
    is_system TINYINT NOT NULL DEFAULT 0{cmt("系统内置 0否 1是")},
    {AUDIT_COLUMN_DEFS.strip()},
    INDEX idx_parent_sort (parent_id, sort_order),
    FOREIGN KEY (parent_id) REFERENCES {SYS_PERMISSIONS}(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS {SYS_PERMISSION_API_BINDINGS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    permission_id BIGINT NOT NULL{cmt("权限ID")},
    api_permission_id BIGINT NOT NULL{cmt("绑定的API权限ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_perm_api (permission_id, api_permission_id),
    FOREIGN KEY (permission_id) REFERENCES {SYS_PERMISSIONS}(id) ON DELETE CASCADE,
    FOREIGN KEY (api_permission_id) REFERENCES {SYS_PERMISSIONS}(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS {SYS_PERMISSION_API_ROUTES} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    permission_id BIGINT NOT NULL{cmt("权限ID")},
    api_method VARCHAR(16) NOT NULL{cmt("HTTP方法")},
    api_path_pattern VARCHAR(512) NOT NULL{cmt("API路径模式")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_perm_route (permission_id, api_method, api_path_pattern),
    FOREIGN KEY (permission_id) REFERENCES {SYS_PERMISSIONS}(id) ON DELETE CASCADE
);
"""


def create_user_table_preference_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_USER_TABLE_PREFERENCE} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    user_id BIGINT NOT NULL{cmt("用户ID")},
    page_key VARCHAR(64) NOT NULL{cmt("页面键")},
    table_key VARCHAR(64) NOT NULL{cmt("表格键")},
    config_json JSON NOT NULL{cmt("列配置JSON")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_user_table_pref (user_id, page_key, table_key),
    FOREIGN KEY (user_id) REFERENCES {SYS_USER}(id) ON DELETE CASCADE
);
"""


def create_scheduled_job_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_SCHEDULED_JOB} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    code VARCHAR(64) NOT NULL UNIQUE{cmt("任务编码")},
    name VARCHAR(128) NOT NULL{cmt("任务名称")},
    description VARCHAR(512) NOT NULL DEFAULT ''{cmt("描述")},
    cron_expr VARCHAR(64) NOT NULL{cmt("Cron表达式")},
    enabled TINYINT NOT NULL DEFAULT 1{ENABLED_FLAG},
    last_run_at DATETIME(6) NULL{cmt("上次运行时间(UTC)")},
    last_run_status VARCHAR(16) NULL{cmt("上次运行状态 ok成功 error失败")},
    last_run_message VARCHAR(512) NOT NULL DEFAULT ''{cmt("上次运行消息")},
    next_run_at DATETIME(6) NULL{cmt("下次运行时间(UTC)")},
    {AUDIT_COLUMN_DEFS.strip()},
    KEY idx_scheduled_job_enabled (enabled)
);
"""


def all_sys_ddl_statements() -> list[str]:
    """按依赖顺序返回系统表 DDL 语句列表。"""
    raw = (
        create_organization_sql()
        + create_tenant_sql()
        + create_tenant_system_role_sql()
        + create_org_tenant_sql()
        + create_user_sql()
        + create_user_tenant_sql()
        + create_sys_roles_sql()
        + create_permissions_sql()
        + create_user_table_preference_sql()
        + create_scheduled_job_sql()
    )
    return [s.strip() for s in raw.split(";") if s.strip()]
