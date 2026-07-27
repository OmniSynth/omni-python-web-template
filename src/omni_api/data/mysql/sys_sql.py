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
    SYS_DEV_PARAM,
    SYS_DEV_PARAM_GROUP,
    SYS_SCHEDULED_JOB,
    SYS_SCHEDULED_JOB_RUN,
    SYS_SCHEDULED_JOB_TENANT,
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
    table_cmt,
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
){table_cmt("机构")};
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
){table_cmt("机构租户关联")};
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
){table_cmt("租户")};
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
){table_cmt("租户预置系统角色")};
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
){table_cmt("用户")};
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
){table_cmt("用户租户成员")};
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
){table_cmt("系统角色")};

CREATE TABLE IF NOT EXISTS {SYS_ROLE_PERMISSIONS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    role_id BIGINT NOT NULL{cmt("角色ID")},
    permission_code VARCHAR(128) NOT NULL{cmt("权限编码")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_role_permission (role_id, permission_code),
    FOREIGN KEY (role_id) REFERENCES {SYS_ROLES}(id) ON DELETE CASCADE
){table_cmt("系统角色权限")};

CREATE TABLE IF NOT EXISTS {SYS_USER_ROLES} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    user_id BIGINT NOT NULL{cmt("用户ID")},
    role_id BIGINT NOT NULL{cmt("角色ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_user_role (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES {SYS_USER}(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES {SYS_ROLES}(id) ON DELETE CASCADE
){table_cmt("系统用户角色")};
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
){table_cmt("权限")};

CREATE TABLE IF NOT EXISTS {SYS_PERMISSION_API_BINDINGS} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    permission_id BIGINT NOT NULL{cmt("权限ID")},
    api_permission_id BIGINT NOT NULL{cmt("绑定的API权限ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_perm_api (permission_id, api_permission_id),
    FOREIGN KEY (permission_id) REFERENCES {SYS_PERMISSIONS}(id) ON DELETE CASCADE,
    FOREIGN KEY (api_permission_id) REFERENCES {SYS_PERMISSIONS}(id) ON DELETE CASCADE
){table_cmt("权限API绑定")};

CREATE TABLE IF NOT EXISTS {SYS_PERMISSION_API_ROUTES} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    permission_id BIGINT NOT NULL{cmt("权限ID")},
    api_method VARCHAR(16) NOT NULL{cmt("HTTP方法")},
    api_path_pattern VARCHAR(512) NOT NULL{cmt("API路径模式")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_perm_route (permission_id, api_method, api_path_pattern),
    FOREIGN KEY (permission_id) REFERENCES {SYS_PERMISSIONS}(id) ON DELETE CASCADE
){table_cmt("权限API路由")};
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
){table_cmt("用户表格偏好")};
"""


def create_scheduled_job_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_SCHEDULED_JOB} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    code VARCHAR(64) NOT NULL UNIQUE{cmt("任务编码")},
    name VARCHAR(128) NOT NULL{cmt("任务名称")},
    description VARCHAR(512) NOT NULL DEFAULT ''{cmt("描述")},
    scope VARCHAR(16) NOT NULL DEFAULT 'tenant'{cmt("任务范围：system系统 tenant租户")},
    cron_expr VARCHAR(64) NOT NULL{cmt("Cron表达式")},
    enabled TINYINT NOT NULL DEFAULT 1{ENABLED_FLAG},
    last_run_at DATETIME(6) NULL{cmt("上次运行时间(UTC)")},
    last_run_status VARCHAR(16) NULL{cmt("上次运行状态：success成功 failure失败 running执行中")},
    last_run_message VARCHAR(512) NOT NULL DEFAULT ''{cmt("上次运行消息")},
    next_run_at DATETIME(6) NULL{cmt("下次运行时间(UTC)")},
    {AUDIT_COLUMN_DEFS.strip()},
    KEY idx_scheduled_job_enabled (enabled),
    KEY idx_scheduled_job_scope (scope)
){table_cmt("定时任务")};
"""


def create_scheduled_job_tenant_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_SCHEDULED_JOB_TENANT} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    job_code VARCHAR(64) NOT NULL{cmt("任务编码，对应 t_sys_scheduled_job.code")},
    tenant_id BIGINT NOT NULL{cmt("租户 ID")},
    enabled TINYINT NOT NULL DEFAULT 1{cmt("租户侧调度是否启用：1启用 0停止")},
    last_run_at DATETIME(6) NULL{cmt("该租户上次运行时间(UTC)")},
    last_run_status VARCHAR(16) NULL{cmt("该租户上次运行状态：success成功 failure失败 running执行中")},
    last_run_message VARCHAR(512) NOT NULL DEFAULT ''{cmt("该租户上次运行消息")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uk_scheduled_job_tenant (job_code, tenant_id),
    KEY idx_scheduled_job_tenant_tid (tenant_id),
    CONSTRAINT fk_scheduled_job_tenant_job FOREIGN KEY (job_code) REFERENCES {SYS_SCHEDULED_JOB} (code),
    CONSTRAINT fk_scheduled_job_tenant_tenant FOREIGN KEY (tenant_id) REFERENCES {SYS_TENANT} (id)
){table_cmt("定时任务租户调度")};
"""


def create_scheduled_job_run_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_SCHEDULED_JOB_RUN} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    run_id VARCHAR(36) NOT NULL{cmt("执行追踪UUID")},
    job_code VARCHAR(64) NOT NULL{cmt("任务编码")},
    scope VARCHAR(16) NOT NULL{cmt("任务范围快照：system系统 tenant租户")},
    tenant_id BIGINT NULL{cmt("租户ID；系统任务为空")},
    trigger_type VARCHAR(16) NOT NULL{cmt("触发方式：cron定时 manual手动")},
    actor_user_id BIGINT NULL{cmt("手动触发操作人用户ID")},
    actor_username VARCHAR(128) NULL{cmt("手动触发操作人用户名")},
    trigger_request_id VARCHAR(36) NULL{cmt("手动触发关联请求追踪ID")},
    params_json JSON NULL{cmt("入参关节JSON")},
    context_json JSON NULL{cmt("复现环境JSON")},
    status VARCHAR(16) NOT NULL{cmt("状态：running执行中 success成功 failure失败 partial部分成功 skipped跳过")},
    summary VARCHAR(2048) NOT NULL DEFAULT ''{cmt("业务可读摘要")},
    result_json JSON NULL{cmt("结构化结果关节JSON")},
    error_text VARCHAR(4096) NULL{cmt("错误详情")},
    started_at DATETIME(6) NOT NULL{cmt("开始时间(UTC)")},
    finished_at DATETIME(6) NULL{cmt("结束时间(UTC)")},
    duration_ms INT NULL{cmt("耗时(毫秒)")},
    UNIQUE KEY uq_scheduled_job_run_id (run_id),
    KEY idx_job_run_code_started (job_code, started_at),
    KEY idx_job_run_tenant_started (tenant_id, started_at),
    KEY idx_job_run_status_started (status, started_at),
    KEY idx_job_run_started (started_at)
){table_cmt("定时任务执行记录")};
"""


def create_sys_dev_param_group_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_DEV_PARAM_GROUP} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    name VARCHAR(64) NOT NULL{cmt("分组名称")},
    description VARCHAR(300) NOT NULL DEFAULT ''{cmt("分组描述")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_dev_param_group_name (name)
){table_cmt("系统开发参数分组")};
"""


def create_sys_dev_param_sql() -> str:
    return f"""
CREATE TABLE IF NOT EXISTS {SYS_DEV_PARAM} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    group_id BIGINT NOT NULL{cmt("分组ID")},
    param_key VARCHAR(64) NOT NULL{cmt("参数键")},
    param_value TEXT NOT NULL{cmt("参数值")},
    remark VARCHAR(512) NOT NULL DEFAULT ''{cmt("备注")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_sys_dev_param_key (param_key),
    KEY idx_sys_dev_param_group (group_id),
    FOREIGN KEY (group_id) REFERENCES {SYS_DEV_PARAM_GROUP}(id)
){table_cmt("系统开发参数")};
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
        + create_scheduled_job_tenant_sql()
        + create_scheduled_job_run_sql()
        + create_sys_dev_param_group_sql()
        + create_sys_dev_param_sql()
    )
    return [s.strip() for s in raw.split(";") if s.strip()]
