/** Dexie 本地库：会话快照与表格偏好。 */

import Dexie, { type Table } from "dexie";
import type { SessionRow, TablePreferenceRow } from "@/db/types";

export const APP_DB_NAME = "omni-local";

const IDB_OPEN_TIMEOUT_MS = 8_000;

class AppDatabase extends Dexie {
  session!: Table<SessionRow, string>;
  tablePreferences!: Table<TablePreferenceRow, string>;

  constructor() {
    super(APP_DB_NAME);
    this.version(1).stores({
      session: "id",
      tablePreferences: "id",
    });
  }
}

let dbInstance: AppDatabase | null = null;
let idbDisabled = false;

export function isIndexedDbSupported(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

export function isAppDbReady(): boolean {
  return !idbDisabled && dbInstance?.isOpen() === true;
}

export function getAppDb(): AppDatabase {
  if (!isAppDbReady() || !dbInstance) {
    throw new Error("AppDatabase 不可用");
  }
  return dbInstance;
}

function withOpenTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`IndexedDB 打开超时（${ms}ms）`));
    }, ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

/** 打开本地库；失败时降级为无持久化（Safari 隐私模式等）。 */
export async function openAppDb(): Promise<AppDatabase | null> {
  if (idbDisabled || !isIndexedDbSupported()) {
    return null;
  }
  try {
    const db = dbInstance ?? new AppDatabase();
    await withOpenTimeout(db.open(), IDB_OPEN_TIMEOUT_MS);
    dbInstance = db;
    return db;
  } catch (err) {
    console.warn("[omni] IndexedDB 不可用，已降级为无本地缓存", err);
    idbDisabled = true;
    if (dbInstance) {
      try {
        dbInstance.close();
      } catch {
        /* 忽略 */
      }
    }
    dbInstance = null;
    return null;
  }
}

/** 删除并重建数据库实例（登出后调用）。 */
export async function deleteAppDb(): Promise<void> {
  if (!isIndexedDbSupported()) {
    return;
  }
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      /* 忽略 */
    }
    dbInstance = null;
  }
  try {
    await Dexie.delete(APP_DB_NAME);
    idbDisabled = false;
  } catch (err) {
    console.warn("[omni] 删除 IndexedDB 失败", err);
    idbDisabled = true;
  }
}
