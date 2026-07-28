import type { CachedTenantDisplay } from "@/db/types";
import { readDeviceTenantDisplay } from "@/lib/device-tenant-display";
import type { AuthUser, BoundTenantInfo } from "@/types/auth";

export type CurrentTenantDisplay = CachedTenantDisplay;

/** 优先 API 租户列表，刷新未完成时回退本地缓存。 */
export function resolveCurrentTenantDisplay(
  user: AuthUser | null,
  boundTenants: BoundTenantInfo[],
  cached: CachedTenantDisplay | null,
): CurrentTenantDisplay | null {
  if (!user?.tenant_id || user.need_tenant_select) {
    return null;
  }
  const fromList = boundTenants.find((t) => t.id === user.tenant_id);
  if (fromList) {
    return {
      tenant_id: fromList.id,
      name: fromList.name,
      code: fromList.code,
    };
  }
  if (cached && cached.tenant_id === user.tenant_id) {
    return cached;
  }
  return null;
}

export function readCachedTenantDisplayForUser(
  user: AuthUser | null,
  readCache: () => CachedTenantDisplay | null,
): CachedTenantDisplay | null {
  if (!user?.tenant_id || user.need_tenant_select) {
    return null;
  }
  const cached = readCache();
  if (cached && cached.tenant_id === user.tenant_id) {
    return cached;
  }
  return null;
}

/** 顶栏/标签页展示：会话租户优先；设备缓存仅在 tenant_id 一致时回退，避免注册后短暂显示上一家企业名。 */
export function resolveBrandTenantDisplay(
  sessionTenant: CurrentTenantDisplay | null,
  user: AuthUser | null = null,
): CurrentTenantDisplay | null {
  if (sessionTenant?.name?.trim()) {
    return sessionTenant;
  }
  const device = readDeviceTenantDisplay();
  if (!device) return null;
  if (user?.tenant_id != null && !user.need_tenant_select) {
    return device.tenant_id === user.tenant_id ? device : null;
  }
  return device;
}
