/** 认证会话 hydrate / refresh / login / logout / switchTenant 实现。 */

import { readSessionRow, writeSessionSnapshot, writeSessionToken } from "@/db/session-repo";
import type { CachedTenantDisplay } from "@/db/types";
import { ApiError, api } from "@/lib/api";
import { readDeviceTenantDisplay } from "@/lib/device-tenant-display";
import { navTreesEqual, normalizeNavTree, resolveHydratedNavTree, writeDeviceNavTree } from "@/lib/nav-tree-cache";
import { purgeLocalSession } from "@/lib/purge-local-data";
import { setSessionToken } from "@/lib/session-token";
import { readCachedTenantDisplayForUser } from "@/lib/tenant-display";
import type { AuthUser, BoundTenantInfo, PermissionInfo } from "@/types/auth";

export interface LoginResult {
  needTenantSelect: boolean;
}

export interface AuthSessionSlice {
  token: string | null;
  user: AuthUser | null;
  navTree: PermissionInfo[];
  boundTenants: BoundTenantInfo[];
  tenantDisplayCache: CachedTenantDisplay | null;
  loading: boolean;
  refreshing: boolean;
}

type AuthSet = (partial: Partial<AuthSessionSlice> | AuthSessionSlice) => void;
type AuthGet = () => {
  token: string | null;
  user: AuthUser | null;
  navTree: PermissionInfo[];
  boundTenants: BoundTenantInfo[];
  reset: () => void;
  syncTenantDisplayFromBoundTenants: () => Promise<void>;
};

async function loadRemoteSession(): Promise<{ user: AuthUser; navTree: PermissionInfo[] }> {
  const [userResult, navResult] = await Promise.allSettled([api.auth.me(), api.auth.nav()]);
  if (userResult.status === "rejected") {
    throw userResult.reason;
  }
  const user = userResult.value;
  if (navResult.status === "fulfilled") {
    return { user, navTree: normalizeNavTree(navResult.value) };
  }
  if (navResult.reason instanceof ApiError && navResult.reason.status === 401) {
    throw navResult.reason;
  }
  return { user, navTree: [] };
}

async function persistSessionNav(user: AuthUser, navTree: PermissionInfo[]): Promise<void> {
  writeDeviceNavTree(user.id, user.tenant_id, navTree);
  await writeSessionSnapshot(user, navTree);
}

async function applyRemoteSession(
  set: AuthSet,
  get: AuthGet,
  session: { user: AuthUser; navTree: PermissionInfo[] },
  tenants: BoundTenantInfo[],
): Promise<void> {
  const remoteNavTree = normalizeNavTree(session.navTree);
  const { navTree: currentNavTree } = get();
  const navChanged = remoteNavTree.length > 0 && !navTreesEqual(currentNavTree, remoteNavTree);
  set({
    user: session.user,
    boundTenants: tenants,
    ...(navChanged ? { navTree: remoteNavTree } : {}),
  });
  const navTreeToPersist = navChanged ? remoteNavTree : currentNavTree;
  if (navChanged) {
    writeDeviceNavTree(session.user.id, session.user.tenant_id, remoteNavTree);
  }
  await writeSessionSnapshot(session.user, navTreeToPersist);
  await get().syncTenantDisplayFromBoundTenants();
}

export async function hydrateAuthSession(set: AuthSet): Promise<void> {
  const row = await readSessionRow();
  if (!row?.token && !row?.user) {
    set({ loading: false, refreshing: false });
    return;
  }
  const tenantDisplayCache = row.user
    ? (readCachedTenantDisplayForUser(row.user, () => row.tenantDisplay) ?? readDeviceTenantDisplay())
    : readDeviceTenantDisplay();
  const hasCachedUser = Boolean(row.user);
  const navTree = row.user
    ? resolveHydratedNavTree(row.user.id, row.user.tenant_id, row.navTree)
    : normalizeNavTree(row.navTree ?? []);
  if (row.user && navTree.length > 0) {
    writeDeviceNavTree(row.user.id, row.user.tenant_id, navTree);
    if (!navTreesEqual(navTree, row.navTree ?? [])) {
      await writeSessionSnapshot(row.user, navTree);
    }
  }
  setSessionToken(row.token);
  set({
    token: row.token,
    user: row.user,
    navTree,
    tenantDisplayCache,
    loading: !hasCachedUser,
    refreshing: false,
  });
}

export async function refreshAuthSession(set: AuthSet, get: AuthGet, initialState: AuthSessionSlice): Promise<void> {
  const { token, user: cachedUser } = get();
  if (!token) {
    setSessionToken(null);
    set({ ...initialState, loading: false, refreshing: false });
    return;
  }
  set(cachedUser ? { refreshing: true } : { loading: true });
  try {
    const [session, tenants] = await Promise.all([
      loadRemoteSession(),
      api.auth.tenants().catch(() => [] as BoundTenantInfo[]),
    ]);
    await applyRemoteSession(set, get, session, tenants);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      get().reset();
      return;
    }
    if (!get().user) {
      setSessionToken(null);
      set({ token: null });
    }
  } finally {
    set({ loading: false, refreshing: false });
  }
}

export async function loginAuthSession(
  set: AuthSet,
  get: AuthGet,
  username: string,
  password: string,
): Promise<LoginResult> {
  const res = await api.auth.login(username, password);
  await writeSessionToken(res.session_token);
  setSessionToken(res.session_token);
  set({ token: res.session_token });
  const session = await loadRemoteSession();
  const navTree = normalizeNavTree(session.navTree);
  set({
    user: session.user,
    navTree,
  });
  await persistSessionNav(session.user, navTree);
  const needSelect = Boolean(res.need_tenant_select ?? session.user.need_tenant_select);
  try {
    const tenants = await api.auth.tenants();
    set({ boundTenants: tenants });
    await get().syncTenantDisplayFromBoundTenants();
  } catch {
    set({ boundTenants: [] });
  }
  return { needTenantSelect: needSelect };
}

export async function logoutAuthSession(get: AuthGet): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    /* 忽略登出 API 失败 */
  }
  await purgeLocalSession();
  get().reset();
}

export async function switchTenantAuthSession(set: AuthSet, get: AuthGet, tenantId: number): Promise<void> {
  await api.auth.switchTenant(tenantId);
  const session = await loadRemoteSession();
  const { navTree: currentNavTree } = get();
  const nextNav = session.navTree.length > 0 ? normalizeNavTree(session.navTree) : normalizeNavTree(currentNavTree);
  set({
    user: session.user,
    navTree: nextNav,
  });
  await persistSessionNav(session.user, nextNav);
  try {
    const tenants = await api.auth.tenants();
    set({ boundTenants: tenants });
    await get().syncTenantDisplayFromBoundTenants();
  } catch {
    set({ boundTenants: [] });
  }
}
