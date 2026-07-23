/** 表格偏好 Dexie 仓储。 */

import { getAppDb, isAppDbReady } from "@/db/app-db";
import type { CachedTablePreference } from "@/db/types";
import { preferenceStorageKey } from "@/types/table-preference";

export type { CachedTablePreference };

export async function readTablePreferenceCache(
  userId: number,
  pageKey: string,
  tableKey: string,
): Promise<CachedTablePreference | null> {
  if (!isAppDbReady()) return null;
  try {
    const id = preferenceStorageKey(userId, pageKey, tableKey);
    const row = await getAppDb().tablePreferences.get(id);
    if (!row) return null;
    return {
      config: row.config,
      updatedAt: row.updatedAt,
      syncedAt: row.syncedAt,
    };
  } catch {
    return null;
  }
}

export async function writeTablePreferenceCache(
  userId: number,
  pageKey: string,
  tableKey: string,
  value: CachedTablePreference,
): Promise<void> {
  if (!isAppDbReady()) return;
  try {
    const id = preferenceStorageKey(userId, pageKey, tableKey);
    await getAppDb().tablePreferences.put({ id, ...value });
  } catch {
    /* 忽略 */
  }
}

export async function deleteTablePreferenceCache(userId: number, pageKey: string, tableKey: string): Promise<void> {
  if (!isAppDbReady()) return;
  try {
    const id = preferenceStorageKey(userId, pageKey, tableKey);
    await getAppDb().tablePreferences.delete(id);
  } catch {
    /* 忽略 */
  }
}
