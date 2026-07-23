/** 表格分页默认每页条数选项。 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const max = totalPages(total, pageSize);
  if (page < 1) return 1;
  if (page > max) return max;
  return page;
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  if (items.length === 0) return [];
  const safePage = clampPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** 客户端无限滚动：从首条累积到指定页数。 */
export function sliceThroughPages<T>(items: T[], loadedPageCount: number, pageSize: number): T[] {
  if (items.length === 0 || loadedPageCount <= 0) return [];
  const end = loadedPageCount * pageSize;
  return items.slice(0, Math.min(end, items.length));
}

export type PageToken = number | "ellipsis";

/** 生成分页数字窗口，如 [1, "ellipsis", 4, 5, 6, "ellipsis", 299]。 */
export function buildPageTokens(current: number, totalPageCount: number, siblingCount = 1): PageToken[] {
  if (totalPageCount <= 0) return [1];
  const safeCurrent = Math.min(Math.max(1, current), totalPageCount);

  if (totalPageCount <= 7) {
    return Array.from({ length: totalPageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPageCount]);
  for (let i = safeCurrent - siblingCount; i <= safeCurrent + siblingCount; i += 1) {
    if (i >= 1 && i <= totalPageCount) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const p = sorted[i];
    if (i > 0 && p - sorted[i - 1] > 1) {
      tokens.push("ellipsis");
    }
    tokens.push(p);
  }
  return tokens;
}

/** 页码跳转输入：仅保留数字（正整数逐字输入，允许暂空）。 */
export function sanitizePageJumpInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function parsePageJumpInput(raw: string): number | null {
  const digits = sanitizePageJumpInput(raw);
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}
