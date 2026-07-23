import { useCallback, useSyncExternalStore } from "react";
import { TABLE_MOBILE_LAYOUT_STORAGE_KEY, type TableMobileLayout } from "@/components/table/table-mobile-layout";

const STORAGE_PREFIX = "omni-table-mobile-layout";

const layoutCache = new Map<string, TableMobileLayout>();
const listeners = new Map<string, Set<() => void>>();

function readStoredLayout(key: string, fallback: TableMobileLayout): TableMobileLayout {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
    if (raw === "masonry" || raw === "list") return raw;
  } catch {
    /* 忽略 */
  }
  return fallback;
}

function getLayoutSnapshot(key: string, fallback: TableMobileLayout): TableMobileLayout {
  if (layoutCache.has(key)) return layoutCache.get(key) as TableMobileLayout;
  const stored = readStoredLayout(key, fallback);
  layoutCache.set(key, stored);
  return stored;
}

function subscribeLayout(key: string, onStoreChange: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(onStoreChange);
  listeners.set(key, set);
  return () => {
    set.delete(onStoreChange);
    if (set.size === 0) listeners.delete(key);
  };
}

function writeLayout(key: string, layout: TableMobileLayout): void {
  layoutCache.set(key, layout);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${key}`, layout);
  } catch {
    /* 忽略 */
  }
  for (const listener of listeners.get(key) ?? []) {
    listener();
  }
}

/** 手机端表格布局偏好：全局单一值，切换菜单/刷新后保持不变。 */
export function useMobileTableLayout(defaultLayout: TableMobileLayout = "list") {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeLayout(TABLE_MOBILE_LAYOUT_STORAGE_KEY, onStoreChange),
    [],
  );

  const getSnapshot = useCallback(
    () => getLayoutSnapshot(TABLE_MOBILE_LAYOUT_STORAGE_KEY, defaultLayout),
    [defaultLayout],
  );

  const layout = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setLayout = useCallback((next: TableMobileLayout) => {
    writeLayout(TABLE_MOBILE_LAYOUT_STORAGE_KEY, next);
  }, []);

  return { layout, setLayout };
}
