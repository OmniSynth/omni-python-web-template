import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobalPageSize } from "@/hooks/use-global-page-size";
import { clampPage, PAGE_SIZE_OPTIONS, slicePage, sliceThroughPages, totalPages } from "@/lib/pagination";
import { guardTenantListPage } from "@/lib/tenant-expiry";
import { useAuthStore } from "@/stores/auth-store";

/** 过期租户列表数据上限（与后端 EXPIRED_TENANT_LIST_LIMIT 一致）。 */
const EXPIRED_TENANT_LIST_LIMIT = 500;

interface UseClientPaginationOptions {
  initialPage?: number;
}

/** 前端列表分页：对内存数组切片；每页条数全站共用。 */
export function useClientPagination<T>(items: T[], options: UseClientPaginationOptions = {}) {
  const { initialPage = 1 } = options;
  const { pageSize, setPageSize: setGlobalPageSize } = useGlobalPageSize();
  const [page, setPage] = useState(initialPage);
  const [mobileLoadedPageCount, setMobileLoadedPageCount] = useState(1);
  const tenantExpired = useAuthStore((s) => Boolean(s.user?.tenant_expired));

  const sourceItems = useMemo(
    () => (tenantExpired ? items.slice(0, EXPIRED_TENANT_LIST_LIMIT) : items),
    [items, tenantExpired],
  );
  const total = sourceItems.length;
  const pages = totalPages(total, pageSize);
  const safePage = clampPage(page, total, pageSize);

  useEffect(() => {
    if (tenantExpired && page > 1) {
      setPage(1);
      setMobileLoadedPageCount(1);
    }
  }, [tenantExpired, page]);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 数据源或每页条数变化时重置手机端累积页数
  useEffect(() => {
    setMobileLoadedPageCount(1);
  }, [sourceItems.length, pageSize]);

  const pageItems = useMemo(() => slicePage(sourceItems, safePage, pageSize), [sourceItems, safePage, pageSize]);
  const mobileItems = useMemo(
    () => sliceThroughPages(sourceItems, mobileLoadedPageCount, pageSize),
    [sourceItems, mobileLoadedPageCount, pageSize],
  );
  const mobileHasMore = mobileLoadedPageCount < pages;

  const changePage = useCallback(
    (next: number) => {
      const target = clampPage(next, total, pageSize);
      if (!guardTenantListPage(target)) return;
      setPage(target);
    },
    [pageSize, total],
  );

  const changePageSize = useCallback(
    (next: number) => {
      setGlobalPageSize(next);
      setPage(1);
    },
    [setGlobalPageSize],
  );

  const mobileLoadMore = useCallback(() => {
    const nextCount = Math.min(mobileLoadedPageCount + 1, pages);
    if (!guardTenantListPage(nextCount)) return;
    setMobileLoadedPageCount(nextCount);
  }, [mobileLoadedPageCount, pages]);

  return {
    page: safePage,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    total,
    totalPages: pages,
    items: pageItems,
    mobileItems,
    mobileHasMore,
    mobileLoadMore,
    setPage: changePage,
    setPageSize: changePageSize,
    goFirst: () => changePage(1),
    goLast: () => changePage(pages),
    goPrev: () => changePage(safePage - 1),
    goNext: () => changePage(safePage + 1),
  };
}
