/** 登出 / 401 时清空会话域本地数据。 */

import { deleteAppDb, openAppDb } from "@/db/app-db";
import { DEVICE_NAV_LAYOUT_KEY } from "@/lib/device-nav-layout";
import { DEVICE_TENANT_DISPLAY_KEY } from "@/lib/device-tenant-display";

const DEVICE_LS_ALLOWLIST = new Set([
  "omni-timezone",
  "omni-datetime-format",
  "omni-theme",
  DEVICE_TENANT_DISPLAY_KEY,
  DEVICE_NAV_LAYOUT_KEY,
]);

function clearLocalStorageExceptAllowlist(allowlist: Set<string>): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    for (const key of keys) {
      if (!allowlist.has(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* 忽略 */
  }
}

/** 清空 IndexedDB 与非设备偏好 localStorage（调用方须重置内存 store）。 */
export async function purgeLocalSession(): Promise<void> {
  try {
    await deleteAppDb();
    await openAppDb();
  } catch (err) {
    console.warn("[omni] 清理本地存储失败", err);
  }
  clearLocalStorageExceptAllowlist(DEVICE_LS_ALLOWLIST);
}
