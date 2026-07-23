"""随机密码生成。"""

from __future__ import annotations

import secrets
import string

_ALPHABET = string.ascii_letters + string.digits + "!@#$%"


def generate_random_password(length: int = 12) -> str:
    """生成满足登录校验长度的随机密码。"""
    if length < 6:
        raise ValueError("密码长度至少 6 位")
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))
