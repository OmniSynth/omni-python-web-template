"""对象键生成（客户端不得指定）。"""

from __future__ import annotations

import uuid
from pathlib import PurePosixPath

from omni_api.schemas.oss_param import normalize_oss_basic_path


def normalize_basic_path(basic_path: str) -> str:
    return normalize_oss_basic_path(basic_path)


def join_object_key(*parts: str) -> str:
    cleaned = [p.strip("/").replace("\\", "/") for p in parts if p and p.strip("/")]
    return "/".join(cleaned)


def avatar_object_key(basic_path: str, user_id: int, filename: str) -> str:
    ext = PurePosixPath(filename).suffix.lower() or ".bin"
    if len(ext) > 16:
        ext = ".bin"
    return join_object_key(
        normalize_basic_path(basic_path),
        "system",
        "avatars",
        str(user_id),
        f"{uuid.uuid4().hex}{ext}",
    )


def tenant_export_object_key(basic_path: str, job_id: int, filename: str) -> str:
    """租户导出产物对象键。basic_path 须已含租户前缀。"""
    safe_name = PurePosixPath(filename).name.strip() or "export.xlsx"
    safe_name = safe_name.replace("..", "_")[:180]
    return join_object_key(
        normalize_basic_path(basic_path),
        "exports",
        str(job_id),
        safe_name,
    )
