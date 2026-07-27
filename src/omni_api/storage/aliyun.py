"""阿里云 OSS 占位（本轮未实现）。"""

from __future__ import annotations

from typing import BinaryIO

from omni_api.storage.types import OssConfig


class AliyunObjectStore:
    def __init__(self, config: OssConfig) -> None:
        self._config = config

    def public_url(self, object_key: str) -> str:
        raise NotImplementedError("阿里云 OSS 尚未实现")

    def put_bytes(
        self,
        object_key: str,
        data: bytes,
        *,
        content_type: str | None = None,
    ) -> str:
        raise NotImplementedError("阿里云 OSS 尚未实现")

    def put_stream(
        self,
        object_key: str,
        stream: BinaryIO,
        *,
        content_type: str | None = None,
        content_length: int | None = None,
    ) -> str:
        raise NotImplementedError("阿里云 OSS 尚未实现")

    def delete(self, object_key: str) -> None:
        raise NotImplementedError("阿里云 OSS 尚未实现")
