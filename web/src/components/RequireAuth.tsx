import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function userLacksTenantAccess(user: {
  need_tenant_select?: boolean;
  tenant_id?: number | null;
  permissions: string[];
  roles: string[];
}): boolean {
  return !user.need_tenant_select && user.tenant_id != null && user.permissions.length === 0 && user.roles.length === 0;
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading && !user) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">加载中…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if ((user.need_tenant_select || userLacksTenantAccess(user)) && location.pathname !== "/select-tenant") {
    return (
      <Navigate to="/select-tenant" replace state={userLacksTenantAccess(user) ? { accessDenied: true } : undefined} />
    );
  }

  return <Outlet />;
}

export function RequirePermission({ permission }: { permission: string }) {
  const { user, hasPermission, defaultHomePath } = useAuth();
  if (!user) return null;
  if (!hasPermission(permission)) {
    return <Navigate to={defaultHomePath ?? "/"} replace />;
  }
  return <Outlet />;
}
