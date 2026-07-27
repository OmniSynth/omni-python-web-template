"""API + Web 统一启动入口。"""

from __future__ import annotations

import argparse
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from omni_api.api import (
    audit_router,
    auth_router,
    depts_router,
    dev_params_router,
    health_router,
    orgs_router,
    permissions_router,
    roles_router,
    scheduled_jobs_router,
    sys_dev_params_router,
    table_preferences_router,
    tenant_depts_router,
    tenant_roles_router,
    tenant_scheduled_jobs_router,
    tenant_users_router,
    tenants_router,
    user_profile_router,
    users_router,
)
from omni_api.api.actor_middleware import ActorMiddleware
from omni_api.api.permission_middleware import PermissionMiddleware
from omni_api.api.request_audit_middleware import RequestAuditMiddleware
from omni_api.api.tenant_expiry_middleware import TenantExpiryMiddleware
from omni_api.config.local_ip import primary_lan_ip
from omni_api.config.settings import get_settings
from omni_api.data.mysql.sql_audit_listener import (
    start_slow_sql_worker,
    stop_slow_sql_worker,
)
from omni_api.services.auth_service import AuthService
from omni_api.services.scheduled_job_manager import ScheduledJobManager

STATIC_DIR = Path(__file__).parent / "src" / "omni_api" / "web" / "static"


def _log_lan_access(bind_host: str, bind_port: int) -> None:
    if bind_host not in ("0.0.0.0", "::"):
        return
    lan_ip = primary_lan_ip()
    if not lan_ip:
        return
    logging.getLogger("uvicorn.error").info(
        "Network accessible at: http://%s:%s",
        lan_ip,
        bind_port,
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # 仅建 t_sys_* 系统表；租户 t_biz_* 分表与权限由 scripts/sync_rbac.py 处理
    await AuthService().bootstrap()
    await ScheduledJobManager.get().startup()
    await start_slow_sql_worker()
    bind_host = getattr(app.state, "bind_host", None)
    bind_port = getattr(app.state, "bind_port", None)
    if isinstance(bind_host, str) and isinstance(bind_port, int):
        _log_lan_access(bind_host, bind_port)
    try:
        yield
    finally:
        await ScheduledJobManager.get().shutdown()
        await stop_slow_sql_worker()


def _mount_spa(app: FastAPI) -> None:
    """挂载 Vite 构建产物并支持 React Router 客户端路由。"""
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    index_file = STATIC_DIR / "index.html"
    if not index_file.is_file():
        return

    @app.get("/")
    async def spa_index() -> FileResponse:
        return FileResponse(index_file)

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(index_file)


def create_app(*, api: bool = True, web: bool = True) -> FastAPI:
    app = FastAPI(title="omni-python-web-template", version="0.1.0", lifespan=lifespan)
    app.add_middleware(ActorMiddleware)
    app.add_middleware(TenantExpiryMiddleware)
    app.add_middleware(PermissionMiddleware)
    app.add_middleware(RequestAuditMiddleware)
    if api:
        app.include_router(health_router)
        app.include_router(auth_router)
        app.include_router(audit_router)
        app.include_router(users_router)
        app.include_router(user_profile_router)
        app.include_router(table_preferences_router)
        app.include_router(scheduled_jobs_router)
        app.include_router(roles_router)
        app.include_router(permissions_router)
        app.include_router(orgs_router)
        app.include_router(tenants_router)
        app.include_router(tenant_users_router)
        app.include_router(tenant_roles_router)
        app.include_router(tenant_depts_router)
        app.include_router(tenant_scheduled_jobs_router)
        app.include_router(depts_router)
        app.include_router(dev_params_router)
        app.include_router(sys_dev_params_router)
    if web:
        _mount_spa(app)
    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="启动 API 与 Web 服务")
    parser.add_argument("--api-only", action="store_true")
    parser.add_argument("--web-only", action="store_true")
    parser.add_argument("--host", default=None)
    parser.add_argument("--port", type=int, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    settings = get_settings()
    host = args.host or settings.app.host
    port = args.port or settings.app.port
    api = not args.web_only
    web = not args.api_only
    app = create_app(api=api, web=web)
    app.state.bind_host = host
    app.state.bind_port = port
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
