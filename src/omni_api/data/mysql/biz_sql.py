"""租户业务物理分表 DDL 模板。"""

from __future__ import annotations

from omni_api.data.mysql.audit import AUDIT_COLUMN_DEFS
from omni_api.data.mysql.biz_table import SYS_USER, biz_table
from omni_api.data.mysql.ddl_comment import (
    DATA_SCOPE_ENUM,
    ENABLED_FLAG,
    ID_PK,
    SCOPE_TYPE_ENUM,
    cmt,
)


def dept_ddl(tenant_id: int) -> str:
    t = biz_table("dept", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    parent_id BIGINT NOT NULL DEFAULT 0{cmt("父部门ID 0为根")},
    name VARCHAR(128) NOT NULL{cmt("部门名称")},
    sort_order INT NOT NULL DEFAULT 0{cmt("排序")},
    enabled TINYINT NOT NULL DEFAULT 1{ENABLED_FLAG},
    {AUDIT_COLUMN_DEFS.strip()},
    KEY idx_dept_parent (parent_id)
);
"""


def roles_ddl(tenant_id: int) -> str:
    t = biz_table("roles", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    code VARCHAR(64) NOT NULL{cmt("角色编码")},
    name VARCHAR(128) NOT NULL{cmt("角色名称")},
    description VARCHAR(512) NOT NULL DEFAULT ''{cmt("描述")},
    data_scope TINYINT NOT NULL DEFAULT 3{cmt(DATA_SCOPE_ENUM)},
    system_managed TINYINT NOT NULL DEFAULT 0{cmt("系统预置角色 0否 1是")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_role_code (code)
);
"""


def role_permissions_ddl(tenant_id: int) -> str:
    roles = biz_table("roles", tenant_id)
    t = biz_table("role_permissions", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    role_id BIGINT NOT NULL{cmt("角色ID")},
    permission_code VARCHAR(128) NOT NULL{cmt("权限编码")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_role_permission (role_id, permission_code),
    FOREIGN KEY (role_id) REFERENCES {roles}(id) ON DELETE CASCADE
);
"""


def user_roles_ddl(tenant_id: int) -> str:
    roles = biz_table("roles", tenant_id)
    t = biz_table("user_roles", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    user_id BIGINT NOT NULL{cmt("用户ID t_sys_user.id")},
    role_id BIGINT NOT NULL{cmt("角色ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_user_role (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES {SYS_USER}(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES {roles}(id) ON DELETE CASCADE
);
"""


def role_data_scope_ddl(tenant_id: int) -> str:
    roles = biz_table("roles", tenant_id)
    t = biz_table("role_data_scope", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    role_id BIGINT NOT NULL{cmt("角色ID")},
    scope_type VARCHAR(16) NOT NULL{cmt(SCOPE_TYPE_ENUM)},
    scope_id BIGINT NOT NULL{cmt("范围目标ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_role_scope (role_id, scope_type, scope_id),
    FOREIGN KEY (role_id) REFERENCES {roles}(id) ON DELETE CASCADE
);
"""


def user_data_scope_ddl(tenant_id: int) -> str:
    t = biz_table("user_data_scope", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    user_id BIGINT NOT NULL{cmt("用户ID t_sys_user.id")},
    scope_type VARCHAR(16) NOT NULL{cmt(SCOPE_TYPE_ENUM)},
    scope_id BIGINT NOT NULL{cmt("范围目标ID")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_user_scope (user_id, scope_type, scope_id),
    FOREIGN KEY (user_id) REFERENCES {SYS_USER}(id) ON DELETE CASCADE
);
"""


def dev_param_group_ddl(tenant_id: int) -> str:
    t = biz_table("dev_param_group", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    name VARCHAR(64) NOT NULL{cmt("分组名称")},
    description VARCHAR(300) NOT NULL DEFAULT ''{cmt("分组描述")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_dev_param_group_name (name)
);
"""


def dev_params_ddl(tenant_id: int) -> str:
    group_t = biz_table("dev_param_group", tenant_id)
    t = biz_table("dev_params", tenant_id)
    return f"""
CREATE TABLE IF NOT EXISTS {t} (
    id BIGINT AUTO_INCREMENT PRIMARY KEY{ID_PK},
    group_id BIGINT NOT NULL{cmt("分组ID")},
    param_key VARCHAR(64) NOT NULL{cmt("参数键")},
    param_value TEXT NOT NULL{cmt("参数值")},
    remark VARCHAR(512) NOT NULL DEFAULT ''{cmt("备注")},
    {AUDIT_COLUMN_DEFS.strip()},
    UNIQUE KEY uq_dev_param_key (param_key),
    KEY idx_dev_param_group (group_id),
    FOREIGN KEY (group_id) REFERENCES {group_t}(id)
);
"""


def all_biz_ddl_statements(tenant_id: int) -> list[str]:
    """按外键依赖顺序返回租户业务表 DDL。"""
    builders = (
        dept_ddl,
        roles_ddl,
        role_permissions_ddl,
        user_roles_ddl,
        role_data_scope_ddl,
        user_data_scope_ddl,
        dev_param_group_ddl,
        dev_params_ddl,
    )
    statements: list[str] = []
    for builder in builders:
        raw = builder(tenant_id).strip()
        for part in raw.split(";"):
            s = part.strip()
            if s:
                statements.append(s)
    return statements
