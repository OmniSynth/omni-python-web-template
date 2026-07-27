"""头像上传至系统对象存储。"""

from __future__ import annotations

import logging
from pathlib import PurePosixPath

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.user_repo import UserRepo
from omni_api.schemas.user_profile import UserProfile, UserProfileUpdate
from omni_api.storage.factory import ObjectStoreFactory, load_system_oss_params
from omni_api.storage.keys import avatar_object_key
from omni_api.storage.types import ObjectStore

logger = logging.getLogger(__name__)

ALLOWED_AVATAR_MIME = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif"}
)
MAX_AVATAR_BYTES = 2 * 1024 * 1024


class AvatarUploadService:
    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine
        self._users = UserRepo(engine)

    async def upload(
        self,
        user_id: int,
        *,
        filename: str,
        content_type: str | None,
        data: bytes,
        actor_id: int | None = None,
    ) -> UserProfile:
        if len(data) == 0:
            raise ValueError("文件为空")
        if len(data) > MAX_AVATAR_BYTES:
            raise ValueError("头像文件不能超过 2MB")
        mime = (content_type or "").split(";", 1)[0].strip().lower()
        if mime not in ALLOWED_AVATAR_MIME:
            raise ValueError("仅支持 JPEG / PNG / WebP / GIF 图片")

        params = await load_system_oss_params(self._engine)
        store = ObjectStoreFactory.from_params(params)
        config_basic = params.get("oss.basic_path") or "omni/static"
        object_key = avatar_object_key(config_basic, user_id, filename or "avatar.bin")
        url = store.put_bytes(object_key, data, content_type=mime)

        old_url = await self._users.get_avatar_url(user_id)
        profile = await self._users.update_profile(
            user_id,
            UserProfileUpdate(avatar_url=url),
            actor_id=actor_id,
        )
        if profile is None:
            raise ValueError("用户不存在")
        self._try_delete_old(store, params.get("oss.domain") or "", old_url)
        return profile

    def _try_delete_old(
        self, store: ObjectStore, domain: str, old_url: str | None
    ) -> None:
        if not old_url or not domain:
            return
        prefix = domain.rstrip("/") + "/"
        if not old_url.startswith(prefix):
            return
        key = old_url[len(prefix) :]
        if not key or ".." in PurePosixPath(key).parts:
            return
        try:
            store.delete(key)
        except Exception:
            logger.warning("删除旧头像对象失败: %s", key, exc_info=True)
