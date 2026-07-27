"""对象存储协议与配置类型。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import BinaryIO, Protocol


@dataclass(frozen=True, slots=True)
class OssConfig:
    """从开发参数组装的对象存储配置。"""

    provider: str
    access_key: str
    secret_key: str
    domain: str
    upload_bucket_domain: str
    basic_path: str


class ObjectStore(Protocol):
    """对象存储抽象：上传、删除、拼公开 URL。"""

    def public_url(self, object_key: str) -> str: ...

    def put_bytes(
        self,
        object_key: str,
        data: bytes,
        *,
        content_type: str | None = None,
    ) -> str: ...

    def put_stream(
        self,
        object_key: str,
        stream: BinaryIO,
        *,
        content_type: str | None = None,
        content_length: int | None = None,
    ) -> str: ...

    def delete(self, object_key: str) -> None: ...
