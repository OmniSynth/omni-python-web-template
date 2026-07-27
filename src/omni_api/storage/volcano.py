"""火山云 TOS 对象存储实现。"""

from __future__ import annotations

from typing import BinaryIO

import tos

from omni_api.schemas.oss_param import parse_tos_bucket_endpoint
from omni_api.storage.types import OssConfig


class VolcanoTosStore:
    """火山引擎 TOS。"""

    def __init__(self, config: OssConfig) -> None:
        if not config.access_key.strip() or not config.secret_key.strip():
            raise ValueError("系统/租户对象存储未配置 Access Key / Secret Key")
        if not config.domain.strip():
            raise ValueError("系统/租户对象存储未配置访问域名")
        if not config.upload_bucket_domain.strip():
            raise ValueError("系统/租户对象存储未配置上传 Bucket 域名")
        bucket, endpoint, region = parse_tos_bucket_endpoint(config.upload_bucket_domain)
        self._domain = config.domain.rstrip("/") + "/"
        self._bucket = bucket
        self._client = tos.TosClientV2(
            config.access_key.strip(),
            config.secret_key.strip(),
            endpoint,
            region,
        )

    def public_url(self, object_key: str) -> str:
        key = object_key.lstrip("/")
        return f"{self._domain}{key}"

    def put_bytes(
        self,
        object_key: str,
        data: bytes,
        *,
        content_type: str | None = None,
    ) -> str:
        key = object_key.lstrip("/")
        self._client.put_object(
            self._bucket,
            key,
            content=data,
            content_type=content_type,
        )
        return self.public_url(key)

    def put_stream(
        self,
        object_key: str,
        stream: BinaryIO,
        *,
        content_type: str | None = None,
        content_length: int | None = None,
    ) -> str:
        data = stream.read()
        if content_length is not None and len(data) != content_length:
            data = data[:content_length]
        return self.put_bytes(object_key, data, content_type=content_type)

    def delete(self, object_key: str) -> None:
        key = object_key.lstrip("/")
        self._client.delete_object(self._bucket, key)
