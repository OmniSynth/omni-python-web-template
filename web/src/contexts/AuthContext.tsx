import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { DEFAULT_DOCUMENT_TITLE } from "@/lib/document-title";
import { resolveDefaultHomePath } from "@/lib/nav-menu-data";
import { REALTIME_CHANNELS, realtimeClient } from "@/lib/realtime/ws-client";
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

function sortedJoin(xs: string[] | undefined): string {
  return [...(xs ?? [])].sort().join("\0");
}

function applyAuthSnapshot(next: AuthUser): void {
  const current = useAuthStore.getState().user;
  if (!current) return;
  const permsChanged = sortedJoin(current.permissions) !== sortedJoin(next.permissions);
  const rolesChanged = sortedJoin(current.roles) !== sortedJoin(next.roles);
  if (
    current.tenant_expired === next.tenant_expired &&
    current.tenant_id === next.tenant_id &&
    current.need_tenant_select === next.need_tenant_select &&
    !permsChanged &&
    !rolesChanged &&
    current.display_name === next.display_name &&
    (current.avatar_url ?? null) === (next.avatar_url ?? null)
  ) {
    return;
  }
  useAuthStore.setState({ user: { ...current, ...next } });
  if (permsChanged) {
    void useAuthStore.getState().refresh();
  }
}

/** 登录后维护单条实时连接；切租户强制重连以刷新服务端上下文。 */
function useRealtimeSession(token: string | null, tenantId: number | null | undefined, enabled: boolean) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: tenantId 变化须强制重连
  useEffect(() => {
    if (!token) {
      realtimeClient.disconnect();
      return;
    }
    realtimeClient.connect(token, true);
  }, [token, tenantId]);

  useEffect(() => {
    return () => {
      realtimeClient.disconnect();
    };
  }, []);

  const onSessionEvent = useCallback((event: { type: string; payload: Record<string, unknown> }) => {
    if (event.type !== "snapshot") return;
    applyAuthSnapshot(event.payload as unknown as AuthUser);
  }, []);

  useRealtimeChannel(REALTIME_CHANNELS.authSession, onSessionEvent, enabled);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
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
  const currentTenant = useMemo(() => resolveBrandTenantDisplay(sessionTenant, user), [sessionTenant, user]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 用户或租户列表变化时同步顶栏品牌展示
  useEffect(() => {
    void syncTenantDisplay();
  }, [user, boundTenants, syncTenantDisplay]);

  useEffect(() => {
    document.title = currentTenant?.name?.trim() || DEFAULT_DOCUMENT_TITLE;
  }, [currentTenant]);

  useRealtimeSession(token, user?.tenant_id, Boolean(token && user));

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
