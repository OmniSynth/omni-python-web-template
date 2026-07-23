"""数据权限范围常量。"""

from __future__ import annotations

# 1 仅本人 / 2 本部门 / 3 本部门及以下 / 4 自定义
DATA_SCOPE_SELF = 1
DATA_SCOPE_DEPT = 2
DATA_SCOPE_DEPT_AND_BELOW = 3
DATA_SCOPE_CUSTOM = 4
DEFAULT_DATA_SCOPE = DATA_SCOPE_DEPT_AND_BELOW
