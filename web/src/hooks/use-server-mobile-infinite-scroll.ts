import { useCallback, useEffect, useMemo, useState } from "react";
import type { TableMobileInfiniteScrollProps } from "@/components/table/table-mobile-infinite-scroll";
import { guardTenantListPage } from "@/lib/tenant-expiry";

type UseServerMobileInfiniteScrollOptions<T> = {
  pageRows: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  rowKey: (row: T) => string | number;
  /** 筛选/Tab 变化时重置累积列表 */
  resetKey: string | number;
  loading?: boolean;
};

function mergeUniqueRows<T>(previous: T[], incoming: T[], rowKey: (row: T) => string | number): T[] {
  if (incoming.length === 0) return previous;
  const seen = new Set(previous.map((row) => rowKey(row)));
  const appended = incoming.filter((row) => !seen.has(rowKey(row)));
  if (appended.length === 0) return previous;
  return [...previous, ...appended];
}

/** 服务端分页：手机端下滑累积加载各页数据。 */
export function useServerMobileInfiniteScroll<T>({
  pageRows,
  page,
  pageSize,
  total,
  onPageChange,
  rowKey,
  resetKey,
  loading = false,
}: UseServerMobileInfiniteScrollOptions<T>) {
  const [mobileRows, setMobileRows] = useState<T[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 筛选/Tab 变化时清空累积列表
  useEffect(() => {
    setMobileRows([]);
  }, [resetKey]);

  useEffect(() => {
    if (page <= 1) {
      setMobileRows(pageRows);
      return;
    }
    setMobileRows((previous) => mergeUniqueRows(previous, pageRows, rowKey));
  }, [page, pageRows, rowKey]);

  const hasMore = page * pageSize < total;

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    if (!guardTenantListPage(next)) return;
    onPageChange(next);
  }, [hasMore, loading, onPageChange, page]);

  const infiniteScroll = useMemo<TableMobileInfiniteScrollProps>(
    () => ({
      hasMore,
      onLoadMore: loadMore,
      loading,
      loadedCount: mobileRows.length,
    }),
    [hasMore, loadMore, loading, mobileRows.length],
  );

  return { mobileRows, infiniteScroll };
}
