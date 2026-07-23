import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import { DEFAULT_DOCUMENT_TITLE } from "@/lib/document-title";
import { resolveDefaultHomePath } from "@/lib/nav-menu-data";
import {
  type CurrentTenantDisplay,
  resolveBrandTenantDisplay,
  resolveCurrentTenantDisplay,
} from "@/lib/tenant-display";
import { type LoginResult, type RegisterResult, useAuthStore } from "@/stores/auth-store";
import type { AuthUser, BoundTenantInfo, PermissionInfo } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  navTree: PermissionInfo[];
  boundTenants: BoundTenantInfo[];
  currentTenant: CurrentTenantDisplay | null;
  loading: boolean;
  refreshing: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  register: (body: {
    name: string;
    org_type: string;
    credit_code: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    region: string;
  }) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  switchTenant: (tenantId: number) => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (...codes: string[]) => boolean;
  /** 当前用户首个可访问菜单路径；无菜单时为 null。 */
  defaultHomePath: string | null;
}

export type { LoginResult, RegisterResult };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const navTree = useAuthStore((s) => s.navTree);
  const boundTenants = useAuthStore((s) => s.boundTenants);
  const tenantDisplayCache = useAuthStore((s) => s.tenantDisplayCache);
  const loading = useAuthStore((s) => s.loading);
  const refreshing = useAuthStore((s) => s.refreshing);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const refresh = useAuthStore((s) => s.refresh);
  const switchTenant = useAuthStore((s) => s.switchTenant);
  const syncTenantDisplay = useAuthStore((s) => s.syncTenantDisplayFromBoundTenants);

  const sessionTenant = useMemo(
    () => resolveCurrentTenantDisplay(user, boundTenants, tenantDisplayCache),
    [user, boundTenants, tenantDisplayCache],
  );

  const currentTenant = useMemo(() => resolveBrandTenantDisplay(sessionTenant), [sessionTenant]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 用户或租户列表变化时同步顶栏品牌展示
  useEffect(() => {
    void syncTenantDisplay();
  }, [user, boundTenants, syncTenantDisplay]);

  useEffect(() => {
    const name = currentTenant?.name?.trim();
    document.title = name || DEFAULT_DOCUMENT_TITLE;
  }, [currentTenant]);

  const hasPermission = useCallback((code: string) => new Set(user?.permissions ?? []).has(code), [user]);

  const hasAnyPermission = useCallback(
    (...codes: string[]) => codes.some((c) => new Set(user?.permissions ?? []).has(c)),
    [user],
  );

  const defaultHomePath = useMemo(() => resolveDefaultHomePath(navTree, hasPermission), [navTree, hasPermission]);

  const value = useMemo(
    () => ({
      user,
      navTree,
      boundTenants,
      currentTenant,
      loading,
      refreshing,
      login,
      register,
      logout,
      refresh,
      switchTenant,
      hasPermission,
      hasAnyPermission,
      defaultHomePath,
    }),
    [
      user,
      navTree,
      boundTenants,
      currentTenant,
      loading,
      refreshing,
      login,
      register,
      logout,
      refresh,
      switchTenant,
      hasPermission,
      hasAnyPermission,
      defaultHomePath,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 须在 AuthProvider 内使用");
  return ctx;
}

export function usePermission(code: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(code);
}
