"""Redis 客户端工厂。"""

from __future__ import annotations

import redis

from omni_api.config.settings import RedisSettings, get_settings


def redis_client(settings: RedisSettings | None = None) -> redis.Redis:
    cfg = settings or get_settings().redis
    return redis.Redis(
        host=cfg.host,
        port=cfg.port,
        db=cfg.db,
        username=cfg.username or None,
        password=cfg.password or None,
        decode_responses=True,
        socket_connect_timeout=2,
        socket_timeout=2,
    )
