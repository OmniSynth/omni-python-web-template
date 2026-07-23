"""权限表 DDL 与行映射。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from omni_api.data.mysql.audit import AUDIT_COLUMN_DEFS
from omni_api.data.mysql.biz_table import (
    SYS_PERMISSION_API_BINDINGS,
    SYS_PERMISSION_API_ROUTES,
    SYS_PERMISSIONS,
)
from omni_api.data.mysql.ddl_comment import ENABLED_FLAG, ID_PK, PERMISSION_KIND_ENUM, cmt
from omni_api.schemas.rbac import PermissionRecord

CREATE_PERMISSIONS_SQL = f"""
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

PERMISSION_SELECT = f"""
SELECT id, code, name, kind, parent_id, sort_order, enabled, route_path,
       component_key, api_method, api_path_pattern, description, is_system,
       created_at, updated_at
FROM {SYS_PERMISSIONS}
"""


def row_to_permission(row: Sequence[Any]) -> PermissionRecord:
    return PermissionRecord(
        id=int(row[0]),
        code=str(row[1]),
        name=str(row[2]),
        kind=str(row[3]),
        parent_id=int(row[4]) if row[4] is not None else None,
        sort_order=int(row[5]),
        enabled=bool(row[6]),
        route_path=str(row[7]) if row[7] is not None else None,
        component_key=str(row[8]) if row[8] is not None else None,
        api_method=str(row[9]) if row[9] is not None else None,
        api_path_pattern=str(row[10]) if row[10] is not None else None,
        description=str(row[11]),
        is_system=bool(row[12]),
        created_at=row[13],
        updated_at=row[14],
    )
