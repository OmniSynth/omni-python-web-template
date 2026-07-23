/** 认证 store 动作实现。 */

import { clearTenantDisplay, writeTenantDisplay } from "@/db/session-repo";
import type { CachedTenantDisplay } from "@/db/types";
import { writeDeviceTenantDisplay } from "@/lib/device-tenant-display";
import { setSessionToken } from "@/lib/session-token";
import type { AuthUser, BoundTenantInfo, PermissionInfo } from "@/types/auth";
import {
  type AuthSessionSlice,
  hydrateAuthSession,
  type LoginResult,
  loginAuthSession,
  logoutAuthSession,
  refreshAuthSession,
  switchTenantAuthSession,
} from "./auth-session-lifecycle";

export type { LoginResult };

const initialState: AuthSessionSlice = {
  token: null,
  user: null,
  navTree: [],
  boundTenants: [],
  tenantDisplayCache: null,
  loading: true,
  refreshing: false,
};

type AuthSet = (partial: Partial<AuthSessionSlice> | AuthSessionSlice) => void;
type AuthGet = () => {
  token: string | null;
  user: AuthUser | null;
  navTree: PermissionInfo[];
  boundTenants: BoundTenantInfo[];
  reset: () => void;
  syncTenantDisplayFromBoundTenants: () => Promise<void>;
};

function createAuthMetaActions(set: AuthSet, get: AuthGet) {
  return {
    reset: () => {
      setSessionToken(null);
      set({ ...initialState, loading: false, refreshing: false });
    },

    setTenantDisplayCache: (display: CachedTenantDisplay | null) => {
      set({ tenantDisplayCache: display });
    },

    syncTenantDisplayFromBoundTenants: async () => {
      const { user, boundTenants } = get();
      if (!user?.tenant_id || user.need_tenant_select) {
        set({ tenantDisplayCache: null });
        await clearTenantDisplay();
        return;
      }
      const tenant = boundTenants.find((t) => t.id === user.tenant_id);
      if (!tenant) return;
      const display: CachedTenantDisplay = {
        tenant_id: tenant.id,
        name: tenant.name,
        code: tenant.code,
      };
      set({ tenantDisplayCache: display });
      await writeTenantDisplay(display);
      writeDeviceTenantDisplay(display);
    },
  };
}

function createAuthSessionActions(set: AuthSet, get: AuthGet) {
  return {
    hydrate: () => hydrateAuthSession(set),
    refresh: () => refreshAuthSession(set, get, initialState),
    login: (username: string, password: string) => loginAuthSession(set, get, username, password),
    logout: () => logoutAuthSession(get),
    switchTenant: (tenantId: number) => switchTenantAuthSession(set, get, tenantId),
  };
}

export function createAuthStoreActions(set: AuthSet, get: AuthGet) {
  return {
    ...createAuthMetaActions(set, get),
    ...createAuthSessionActions(set, get),
  };
}

export { initialState as authInitialState };
