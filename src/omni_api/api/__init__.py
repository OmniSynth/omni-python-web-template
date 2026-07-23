"""API 包。"""

from omni_api.api.auth import router as auth_router
from omni_api.api.audit import router as audit_router
from omni_api.api.depts import router as depts_router
from omni_api.api.dev_params import router as dev_params_router
from omni_api.api.health import router as health_router
from omni_api.api.orgs import router as orgs_router
from omni_api.api.permissions import router as permissions_router
from omni_api.api.roles import router as roles_router
from omni_api.api.scheduled_jobs import router as scheduled_jobs_router
from omni_api.api.table_preferences import router as table_preferences_router
from omni_api.api.tenant_depts import router as tenant_depts_router
from omni_api.api.tenant_roles import router as tenant_roles_router
from omni_api.api.tenant_users import router as tenant_users_router
from omni_api.api.tenants import router as tenants_router
from omni_api.api.user_profile import router as user_profile_router
from omni_api.api.users import router as users_router

__all__ = [
    "auth_router",
    "audit_router",
    "depts_router",
    "dev_params_router",
    "health_router",
    "orgs_router",
    "permissions_router",
    "roles_router",
    "scheduled_jobs_router",
    "table_preferences_router",
    "tenant_depts_router",
    "tenant_roles_router",
    "tenant_users_router",
    "tenants_router",
    "user_profile_router",
    "users_router",
]
