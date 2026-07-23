/** 设备级租户展示（顶栏、标签页）；登出保留，仅切换租户时更新。 */

import type { CachedTenantDisplay } from "@/db/types";

export const DEVICE_TENANT_DISPLAY_KEY = "omni-tenant-display";

function isValidDisplay(value: unknown): value is CachedTenantDisplay {
  if (!value || typeof value !== "object") return false;
  const row = value as CachedTenantDisplay;
  return typeof row.tenant_id === "number" && typeof row.name === "string" && typeof row.code === "string";
}

/** 同步读取设备级租户展示。 */
export function readDeviceTenantDisplay(): CachedTenantDisplay | null {
  try {
    const raw = localStorage.getItem(DEVICE_TENANT_DISPLAY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidDisplay(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDeviceTenantDisplay(display: CachedTenantDisplay): void {
  try {
    localStorage.setItem(DEVICE_TENANT_DISPLAY_KEY, JSON.stringify(display));
  } catch {
    /* 忽略 */
  }
}

/** 将标签页标题设为设备级租户名（无则不改）。 */
export function applyDeviceDocumentTitle(): void {
  const name = readDeviceTenantDisplay()?.name?.trim();
  if (name) {
    document.title = name;
  }
}
