"""MySQL 表审计字段约定。

审计时间列（created_at / updated_at）语义为 UTC naive DATETIME(6)；
依赖连接层 SET time_zone='+00:00' 使 CURRENT_TIMESTAMP 写入 UTC。
"""

from __future__ import annotations

from omni_api.data.mysql.ddl_comment import CREATED_BY, UPDATED_BY, UTC_CREATED, UTC_UPDATED

# 新建表时追加的审计列（须放在业务列之后、索引之前）；时间为 UTC
AUDIT_COLUMN_DEFS = f"""
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6){UTC_CREATED},
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6){UTC_UPDATED},
    created_by BIGINT NULL{CREATED_BY},
    updated_by BIGINT NULL{UPDATED_BY}
"""


def audit_insert_params() -> dict[str, int | None]:
    """INSERT 时绑定 created_by / updated_by。"""
    from omni_api.data.mysql.actor import get_actor_id

    actor = get_actor_id()
    return {"created_by": actor, "updated_by": actor}


def audit_update_params() -> dict[str, int | None]:
    """UPDATE 时绑定 updated_by。"""
    from omni_api.data.mysql.actor import get_actor_id

    return {"updated_by": get_actor_id()}
