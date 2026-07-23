"""从 TOML 与环境变量加载类型化配置。"""

from __future__ import annotations

import os
import tomllib
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_toml(profile: str) -> dict[str, object]:
    path = _project_root() / "config" / f"{profile}.toml"
    if not path.is_file():
        raise FileNotFoundError(f"配置文件不存在: {path}")
    with path.open("rb") as f:
        return tomllib.load(f)


class MySQLSettings(BaseModel):
    host: str = "127.0.0.1"
    port: int = 3306
    database: str = "omni-web"
    user: str = "omni"
    password: str = ""


class RedisSettings(BaseModel):
    host: str = "127.0.0.1"
    port: int = 6379
    db: int = 0
    username: str = ""
    password: str = ""


class AppSettings(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000


class AuthSettings(BaseModel):
    session_ttl_hours: int = 24


class SlowSqlThresholdSettings(BaseModel):
    """慢 SQL 分级阈值（毫秒）。"""

    oltp_warn_ms: int = 50
    oltp_critical_ms: int = 100
    polling_warn_ms: int = 100
    polling_critical_ms: int = 100
    data_warn_ms: int = 500
    data_critical_ms: int = 2000
    artifact_warn_ms: int = 1000
    artifact_critical_ms: int = 3000


class AuditSettings(BaseModel):
    retention_days: int = 90
    archive_dir: str = "audit-archive"
    export_batch_size: int = 5000
    slow_sql_enabled: bool = True
    slow_sql_queue_size: int = 1000
    slow_sql_explain_enabled: bool = True
    slow_sql_thresholds: SlowSqlThresholdSettings = Field(default_factory=SlowSqlThresholdSettings)


class Settings(BaseSettings):
    """应用全局配置。"""

    model_config = SettingsConfigDict(env_prefix="OMNI_", extra="ignore")

    profile: str = "local"
    mysql: MySQLSettings = Field(default_factory=MySQLSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    app: AppSettings = Field(default_factory=AppSettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)
    audit: AuditSettings = Field(default_factory=AuditSettings)

    @property
    def project_root(self) -> Path:
        return _project_root()

    @classmethod
    def from_profile(cls, profile: str | None = None) -> Settings:
        prof = profile or os.getenv("OMNI_PROFILE", "local")
        raw = _load_toml(prof)
        return cls.model_validate({"profile": prof, **raw})


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_profile()
