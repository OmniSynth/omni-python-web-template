import { useCallback, useEffect, useMemo, useState } from "react";
import { useGlobalPageSize } from "@/hooks/use-global-page-size";
import { clampPage, PAGE_SIZE_OPTIONS, slicePage, sliceThroughPages, totalPages } from "@/lib/pagination";

interface UseClientPaginationOptions {
  initialPage?: number;
}

/** 前端列表分页：对内存数组切片；每页条数全站共用。 */
export function useClientPagination<T>(items: T[], options: UseClientPaginationOptions = {}) {
  const { initialPage = 1 } = options;
  const { pageSize, setPageSize: setGlobalPageSize } = useGlobalPageSize();
  const [page, setPage] = useState(initialPage);
  const [mobileLoadedPageCount, setMobileLoadedPageCount] = useState(1);

  const total = items.length;
  const pages = totalPages(total, pageSize);
  const safePage = clampPage(page, total, pageSize);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 数据源或每页条数变化时重置手机端累积页数
  useEffect(() => {
    setMobileLoadedPageCount(1);
  }, [items.length, pageSize]);

  const pageItems = useMemo(() => slicePage(items, safePage, pageSize), [items, safePage, pageSize]);
  const mobileItems = useMemo(
    () => sliceThroughPages(items, mobileLoadedPageCount, pageSize),
    [items, mobileLoadedPageCount, pageSize],
  );
  const mobileHasMore = mobileLoadedPageCount < pages;

  const changePage = useCallback(
    (next: number) => {
      setPage(clampPage(next, total, pageSize));
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
    setMobileLoadedPageCount((current) => Math.min(current + 1, pages));
  }, [pages]);

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
