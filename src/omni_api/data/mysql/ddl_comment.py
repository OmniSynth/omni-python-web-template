"""MySQL 列 COMMENT 片段（DDL 复用）。"""

from __future__ import annotations


def cmt(text: str) -> str:
    """生成列 COMMENT 子句。"""
    escaped = text.replace("\\", "\\\\").replace("'", "''")
    return f" COMMENT '{escaped}'"


# 通用
ID_PK = cmt("主键")
DEPT_ID = cmt("部门ID")
UTC_CREATED = cmt("创建时间(UTC)")
UTC_UPDATED = cmt("更新时间(UTC)")
CREATED_BY = cmt("创建人 t_sys_user.id")
UPDATED_BY = cmt("更新人 t_sys_user.id")

# RBAC / 组织
DATA_SCOPE_ENUM = "数据权限 1仅本人 2本部门 3本部门及以下 4自定义"
MEMBERSHIP_STATUS_ENUM = "成员状态 1在职 2离职"
ENABLED_FLAG = cmt("启用 0否 1是")
SCOPE_TYPE_ENUM = "范围类型 dept部门 user用户"

# 权限
PERMISSION_KIND_ENUM = "权限类型 menu菜单 button按钮 api接口"
ROLE_TYPE_ENUM = "角色类型 system系统 tenant租户"

# 审计日志
AUDIT_LEVEL_ENUM = "日志级别 debug info warn error"
AUDIT_RESULT_ENUM = "操作结果 success failure"
