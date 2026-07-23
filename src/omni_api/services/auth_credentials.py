"""密码哈希与认证异常（无业务依赖，避免循环 import）。"""

from __future__ import annotations

import bcrypt


class AuthError(Exception):
    """认证或鉴权失败。"""


def hash_password(password: str) -> str:
    """生成 bcrypt 密码哈希。"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """校验明文密码。"""
    return bcrypt.checkpw(password.encode(), password_hash.encode())
