/** 会话快照 Dexie 仓储。 */

import { getAppDb, isAppDbReady } from "@/db/app-db";
import { type CachedTenantDisplay, SESSION_ROW_ID, type SessionRow } from "@/db/types";
import type { AuthUser, PermissionInfo } from "@/types/auth";

const EMPTY_SESSION: SessionRow = {
  id: SESSION_ROW_ID,
  token: null,
  user: null,
  navTree: [],
  tenantDisplay: null,
};

export async function readSessionRow(): Promise<SessionRow | null> {
  if (!isAppDbReady()) return null;
  try {
    const row = await getAppDb().session.get(SESSION_ROW_ID);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function writeSessionToken(token: string): Promise<void> {
  if (!isAppDbReady()) return;
  try {
    const existing = (await readSessionRow()) ?? { ...EMPTY_SESSION };
    await getAppDb().session.put({ ...existing, id: SESSION_ROW_ID, token });
  } catch {
    /* 忽略 */
  }
}

export async function writeSessionSnapshot(user: AuthUser, navTree: PermissionInfo[]): Promise<void> {
  if (!isAppDbReady()) return;
  try {
    const existing = (await readSessionRow()) ?? { ...EMPTY_SESSION };
    await getAppDb().session.put({
      ...existing,
      id: SESSION_ROW_ID,
      user,
      navTree,
    });
  } catch {
    /* 忽略 */
  }
}

export async function writeTenantDisplay(display: CachedTenantDisplay): Promise<void> {
  if (!isAppDbReady()) return;
  try {
    const existing = (await readSessionRow()) ?? { ...EMPTY_SESSION };
    await getAppDb().session.put({
      ...existing,
      id: SESSION_ROW_ID,
      tenantDisplay: display,
    });
  } catch {
    /* 忽略 */
  }
}

export async function clearTenantDisplay(): Promise<void> {
  if (!isAppDbReady()) return;
  try {
    const existing = await readSessionRow();
    if (!existing) return;
    await getAppDb().session.put({
      ...existing,
      id: SESSION_ROW_ID,
      tenantDisplay: null,
    });
  } catch {
    /* 忽略 */
  }
}

export async function writeFullSession(row: Omit<SessionRow, "id">): Promise<void> {
  if (!isAppDbReady()) return;
  try {
    await getAppDb().session.put({ ...row, id: SESSION_ROW_ID });
  } catch {
    /* 忽略 */
  }
}
