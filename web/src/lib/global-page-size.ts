import { PAGE_SIZE_OPTIONS, type PageSizeOption } from "@/lib/pagination";

export const GLOBAL_PAGE_SIZE_STORAGE_KEY = "omni-global-page-size";

export const DEFAULT_PAGE_SIZE: PageSizeOption = 20;

export function normalizePageSize(value: number, fallback: PageSizeOption = DEFAULT_PAGE_SIZE): PageSizeOption {
  return PAGE_SIZE_OPTIONS.includes(value as PageSizeOption) ? (value as PageSizeOption) : fallback;
}

/** 读取 localStorage 中的全局每页条数。 */
export function readStoredGlobalPageSize(fallback: PageSizeOption = DEFAULT_PAGE_SIZE): PageSizeOption {
  try {
    const raw = localStorage.getItem(GLOBAL_PAGE_SIZE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return normalizePageSize(parsed, fallback);
  } catch {
    return fallback;
  }
}

/** 写入全局每页条数。 */
export function writeGlobalPageSize(next: number, fallback: PageSizeOption = DEFAULT_PAGE_SIZE): PageSizeOption {
  const size = normalizePageSize(next, fallback);
  try {
    localStorage.setItem(GLOBAL_PAGE_SIZE_STORAGE_KEY, String(size));
  } catch {
    /* 忽略 */
  }
  return size;
}
