"""按开发参数构建 ObjectStore。"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine

from omni_api.data.mysql.dev_param_repo import DevParamRepo
from omni_api.data.mysql.sys_dev_param_repo import SysDevParamRepo
from omni_api.data.mysql.sys_schema import ensure_sys_schema
from omni_api.schemas.oss_param import (
    DEFAULT_OSS_BASIC_PATH,
    DEFAULT_OSS_PROVIDER,
    OSS_PARAM_ACCESS_KEY,
    OSS_PARAM_BASIC_PATH,
    OSS_PARAM_DOMAIN,
    OSS_PARAM_PROVIDER,
    OSS_PARAM_SECRET_KEY,
    OSS_PARAM_UPLOAD_BUCKET_DOMAIN,
    effective_tenant_basic_path,
)
from omni_api.storage.aliyun import AliyunObjectStore
from omni_api.storage.tencent import TencentObjectStore
from omni_api.storage.types import ObjectStore, OssConfig
from omni_api.storage.volcano import VolcanoTosStore


def config_from_params(params: dict[str, str]) -> OssConfig:
    return OssConfig(
        provider=(params.get(OSS_PARAM_PROVIDER) or DEFAULT_OSS_PROVIDER).strip().lower(),
        access_key=(params.get(OSS_PARAM_ACCESS_KEY) or "").strip(),
        secret_key=(params.get(OSS_PARAM_SECRET_KEY) or "").strip(),
        domain=(params.get(OSS_PARAM_DOMAIN) or "").strip(),
        upload_bucket_domain=(params.get(OSS_PARAM_UPLOAD_BUCKET_DOMAIN) or "").strip(),
        basic_path=(params.get(OSS_PARAM_BASIC_PATH) or DEFAULT_OSS_BASIC_PATH).strip(),
    )


class ObjectStoreFactory:
    """按 provider 分发对象存储实现。"""

    @staticmethod
    def from_params(params: dict[str, str]) -> ObjectStore:
        config = config_from_params(params)
        if config.provider == "volcano":
            return VolcanoTosStore(config)
        if config.provider == "aliyun":
            return AliyunObjectStore(config)
        if config.provider == "tencent":
            return TencentObjectStore(config)
        raise ValueError(f"不支持的对象存储提供商: {config.provider}")

    @staticmethod
    def from_config(config: OssConfig) -> ObjectStore:
        return ObjectStoreFactory.from_params(
            {
                OSS_PARAM_PROVIDER: config.provider,
                OSS_PARAM_ACCESS_KEY: config.access_key,
                OSS_PARAM_SECRET_KEY: config.secret_key,
                OSS_PARAM_DOMAIN: config.domain,
                OSS_PARAM_UPLOAD_BUCKET_DOMAIN: config.upload_bucket_domain,
                OSS_PARAM_BASIC_PATH: config.basic_path,
            }
        )


async def load_system_oss_params(engine: AsyncEngine) -> dict[str, str]:
    await ensure_sys_schema(engine)
    repo = SysDevParamRepo(engine)
    await repo.ensure_defaults()
    return await repo.get_map()


async def load_tenant_oss_params(engine: AsyncEngine, tenant_id: int) -> dict[str, str]:
    """加载租户 OSS 参数；基础路径始终由系统路径 + 租户 ID 派生，忽略租户库内值。"""
    repo = DevParamRepo(engine, tenant_id=tenant_id)
    await repo.ensure_defaults(tenant_id)
    params = await repo.get_map(tenant_id)
    sys_params = await load_system_oss_params(engine)
    sys_basic = sys_params.get(OSS_PARAM_BASIC_PATH) or DEFAULT_OSS_BASIC_PATH
    params[OSS_PARAM_BASIC_PATH] = effective_tenant_basic_path(sys_basic, tenant_id)
    return params
