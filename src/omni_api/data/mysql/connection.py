"""MySQL 异步连接。"""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from omni_api.config.settings import MySQLSettings, get_settings
from omni_api.data.mysql.sql_audit_listener import attach_sql_audit_listener

_MYSQL_UTC_SESSION_SQL = "SET time_zone = '+00:00'"


def _attach_utc_session(engine: AsyncEngine) -> AsyncEngine:
    """每个连接建立时将会话时区设为 UTC。"""

    @event.listens_for(engine.sync_engine, "connect")
    def _on_connect(dbapi_connection, connection_record) -> None:  # noqa: ARG001
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute(_MYSQL_UTC_SESSION_SQL)
        finally:
            cursor.close()

    return engine


@lru_cache(maxsize=1)
def mysql_engine(settings: MySQLSettings | None = None) -> AsyncEngine:
    cfg = settings or get_settings().mysql
    url = (
        f"mysql+asyncmy://{cfg.user}:{cfg.password}"
        f"@{cfg.host}:{cfg.port}/{cfg.database}"
    )
    engine = _attach_utc_session(
        create_async_engine(url, pool_pre_ping=True, pool_size=5)
    )
    attach_sql_audit_listener(engine)
    return engine
