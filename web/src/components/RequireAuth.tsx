import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { locationToReturnPath } from "@/lib/post-auth-path";

function userLacksTenantAccess(user: {
  need_tenant_select?: boolean;
  tenant_id?: number | null;
  permissions: string[];
  roles: string[];
}): boolean {
  return !user.need_tenant_select && user.tenant_id != null && user.permissions.length === 0 && user.roles.length === 0;
}

const sessionLoading = (
  <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">加载中…</div>
);

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const returnPath = locationToReturnPath(location);

  if (loading && !user) {
    return sessionLoading;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: returnPath }} />;
  }

  if ((user.need_tenant_select || userLacksTenantAccess(user)) && location.pathname !== "/select-tenant") {
    return (
      <Navigate
        to="/select-tenant"
        replace
        state={{
          from: returnPath,
          ...(userLacksTenantAccess(user) ? { accessDenied: true } : {}),
        }}
      />
    );
  }

  return <Outlet />;
}

export function RequirePermission({ permission }: { permission: string }) {
  const { user, hasPermission, defaultHomePath, loading, refreshing } = useAuth();
  if (!user) return null;
  if (!hasPermission(permission)) {
    // 会话尚未与远端同步时勿重定向，否则刷新深链会被踢到菜单第一项
    if (loading || refreshing) {
      return sessionLoading;
    }
    return <Navigate to={defaultHomePath ?? "/"} replace />;
  }
  return <Outlet />;
}
