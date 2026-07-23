/** 认证会话 Zustand store。 */

import { create } from "zustand";
import type { CachedTenantDisplay } from "@/db/types";
import { registerSessionExpiredHandler } from "@/lib/session-expired";
import { getSessionToken } from "@/lib/session-token";
import { type CurrentTenantDisplay, resolveCurrentTenantDisplay } from "@/lib/tenant-display";
import {
  authInitialState,
  createAuthStoreActions,
  type LoginResult,
  type RegisterResult,
} from "@/stores/auth-store-actions";
import type { AuthUser, BoundTenantInfo, PermissionInfo } from "@/types/auth";

export type { LoginResult, RegisterResult };

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  navTree: PermissionInfo[];
  boundTenants: BoundTenantInfo[];
  tenantDisplayCache: CachedTenantDisplay | null;
  loading: boolean;
  refreshing: boolean;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
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
  switchTenant: (tenantId: number) => Promise<void>;
  reset: () => void;
  setTenantDisplayCache: (display: CachedTenantDisplay | null) => void;
  syncTenantDisplayFromBoundTenants: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...authInitialState,
  loading: true,
  ...createAuthStoreActions(set, get),
}));

export function getAuthToken(): string | null {
  return getSessionToken();
}

registerSessionExpiredHandler(() => {
  useAuthStore.getState().reset();
});

export function selectCurrentTenant(state: AuthState): CurrentTenantDisplay | null {
  return resolveCurrentTenantDisplay(state.user, state.boundTenants, state.tenantDisplayCache);
}

export function selectHasPermission(state: AuthState, code: string): boolean {
  return new Set(state.user?.permissions ?? []).has(code);
}

export function selectHasAnyPermission(state: AuthState, ...codes: string[]): boolean {
  const perms = new Set(state.user?.permissions ?? []);
  return codes.some((c) => perms.has(c));
}
