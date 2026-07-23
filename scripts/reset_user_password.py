#!/usr/bin/env python3
"""重置用户登录密码（运维脚本）。

用法：

  # 按用户名重置，随机生成密码
  OMNI_PROFILE=local uv run scripts/reset_user_password.py --username 13272272602

  # 按用户 ID 重置
  OMNI_PROFILE=local uv run scripts/reset_user_password.py --user-id 1

  # 指定新密码（至少 6 位）
  OMNI_PROFILE=local uv run scripts/reset_user_password.py --username admin --password 'NewPass1!'
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from omni_api.data.mysql.connection import mysql_engine
from omni_api.data.mysql.user_repo import UserRepo
from omni_api.schemas.auth import UserUpdate
from omni_api.services.audit_service import AuditService
from omni_api.services.auth_credentials import hash_password
from omni_api.services.random_password import generate_random_password


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="重置用户登录密码")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--username", help="登录用户名（通常为手机号）")
    group.add_argument("--user-id", type=int, dest="user_id", help="用户 ID")
    parser.add_argument(
        "--password",
        help="指定新密码；省略则随机生成（至少 6 位）",
    )
    return parser.parse_args()


def _resolve_password(raw: str | None) -> str:
    if raw is None:
        return generate_random_password()
    password = raw.strip()
    if len(password) < 6:
        raise ValueError("密码长度至少 6 位")
    return password


async def _run(args: argparse.Namespace) -> None:
    engine = mysql_engine()
    repo = UserRepo(engine)

    if args.user_id is not None:
        user = await repo.get_by_id(args.user_id)
        if user is None:
            raise SystemExit(f"用户不存在: id={args.user_id}")
    else:
        found = await repo.get_by_username(args.username)
        if found is None:
            raise SystemExit(f"用户不存在: username={args.username}")
        user, _ = found

    password = _resolve_password(args.password)
    before = await repo.get_by_id(user.id)
    assert before is not None

    updated = await repo.update_user(
        user.id,
        UserUpdate(),
        password_hash=hash_password(password),
    )
    if updated is None:
        raise SystemExit(f"重置失败: user_id={user.id}")

    await AuditService().ensure_schema()
    await AuditService().record_operation(
        category="user",
        action="reset_password",
        level="system",
        resource_type="user",
        resource_id=str(updated.id),
        before=before,
        after=updated,
        username=updated.username,
        meta_json={"source": "scripts/reset_user_password.py"},
    )

    print(f"已重置密码: user_id={updated.id} username={updated.username}")
    print(f"新密码: {password}")
    print("请妥善保存；已登录会话不会自动失效，用户需重新登录。")


def main() -> None:
    args = parse_args()
    try:
        asyncio.run(_run(args))
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
