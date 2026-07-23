"""租户域 API 依赖。"""

from __future__ import annotations

from fastapi import Depends, HTTPException

from omni_api.api.deps import get_session_data, require_permission
from omni_api.data.mysql.tenant_context import get_tenant_id
from omni_api.schemas.auth import UserRecord


def require_tenant_permission(code: str):
    """要求当前会话租户上下文内拥有指定权限。"""

    async def _dep(
        user: UserRecord = Depends(require_permission(code)),
        session: dict = Depends(get_session_data),
    ) -> UserRecord:
        tid = get_tenant_id()
        if tid is None:
            raise HTTPException(status_code=403, detail="请先选择租户")
        if session.get("need_tenant_select"):
            raise HTTPException(status_code=403, detail="请先选择租户")
        return user

    return _dep


def current_tenant_id() -> int:
    """解析当前会话租户 ID。"""
    tid = get_tenant_id()
    if tid is None:
        raise HTTPException(status_code=403, detail="请先选择租户")
    return tid
