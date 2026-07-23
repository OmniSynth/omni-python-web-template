"""认证与用户引导。"""

from __future__ import annotations

import logging

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.sys_schema import ensure_sys_schema
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.schemas.auth import UserRecord
from omni_api.services.audit_service import AuditService
from omni_api.services.auth_credentials import AuthError, hash_password, verify_password

logger = logging.getLogger(__name__)

__all__ = ["AuthError", "AuthService", "hash_password", "verify_password"]


class AuthService:
    """用户引导与密码工具；会话逻辑见 SessionService。"""

    def _repo(self) -> UserRepo:
        return UserRepo(mysql_engine())

    async def ensure_schema(self) -> None:
        """仅建系统级表（t_sys_*），不含租户业务分表 t_biz_*_{tenant_id}。"""
        engine = mysql_engine()
        await ensure_sys_schema(engine)

    async def bootstrap(self) -> None:
        """启动时仅建系统表（t_sys_*）；租户分表与权限种子由 sync_rbac.py 同步。"""
        await self.ensure_schema()
        await AuditService().ensure_schema()
        if await self._repo().count_users() == 0:
            logger.warning(
                "用户表为空，请执行: uv run scripts/seed_admin.py"
            )

    async def get_user(self, user_id: int) -> UserRecord | None:
        user = await self._repo().get_by_id(user_id)
        if user is None or not user.enabled:
            return None
        return user
