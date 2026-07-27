"""对象存储领域模块。"""

from omni_api.storage.factory import ObjectStoreFactory, load_system_oss_params, load_tenant_oss_params
from omni_api.storage.types import ObjectStore

__all__ = [
    "ObjectStore",
    "ObjectStoreFactory",
    "load_system_oss_params",
    "load_tenant_oss_params",
]
