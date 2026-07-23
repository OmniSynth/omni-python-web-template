import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_PAGE_SIZE,
  GLOBAL_PAGE_SIZE_STORAGE_KEY,
  readStoredGlobalPageSize,
  writeGlobalPageSize,
} from "@/lib/global-page-size";
import type { PageSizeOption } from "@/lib/pagination";

const listeners = new Set<() => void>();

function subscribeGlobalPageSize(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function notifyGlobalPageSizeListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getGlobalPageSizeSnapshot(): PageSizeOption {
  return readStoredGlobalPageSize();
}

/** 全局每页条数：全站共用，切换页面与刷新后保持不变。 */
export function useGlobalPageSize() {
  const pageSize = useSyncExternalStore(subscribeGlobalPageSize, getGlobalPageSizeSnapshot, () => DEFAULT_PAGE_SIZE);

  const setPageSize = useCallback((next: number) => {
    writeGlobalPageSize(next);
    notifyGlobalPageSizeListeners();
  }, []);

  return { pageSize, setPageSize };
}

export { GLOBAL_PAGE_SIZE_STORAGE_KEY };
