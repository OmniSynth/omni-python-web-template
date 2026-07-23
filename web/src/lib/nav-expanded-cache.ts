/** 侧栏目录展开状态缓存（防刷新折叠抖动；登出清除）。 */

export const DEVICE_NAV_EXPANDED_KEY = "omni-nav-expanded";

interface CachedNavExpanded {
  user_id: number;
  tenant_id: number | null;
  codes: string[];
}

function isCachedNavExpanded(value: unknown): value is CachedNavExpanded {
  if (!value || typeof value !== "object") return false;
  const row = value as CachedNavExpanded;
  return (
    typeof row.user_id === "number" &&
    (row.tenant_id === null || typeof row.tenant_id === "number") &&
    Array.isArray(row.codes) &&
    row.codes.every((code) => typeof code === "string")
  );
}

export function readDeviceNavExpanded(userId: number, tenantId: number | null | undefined): string[] {
  try {
    const raw = localStorage.getItem(DEVICE_NAV_EXPANDED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isCachedNavExpanded(parsed)) return [];
    const expectedTenant = tenantId ?? null;
    if (parsed.user_id !== userId || parsed.tenant_id !== expectedTenant) return [];
    return parsed.codes;
  } catch {
    return [];
  }
}

export function writeDeviceNavExpanded(
  userId: number,
  tenantId: number | null | undefined,
  codes: Iterable<string>,
): void {
  try {
    const payload: CachedNavExpanded = {
      user_id: userId,
      tenant_id: tenantId ?? null,
      codes: [...codes],
    };
    localStorage.setItem(DEVICE_NAV_EXPANDED_KEY, JSON.stringify(payload));
  } catch {
    /* 忽略 */
  }
}
