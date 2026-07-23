import type { TableMobileInfiniteScrollProps } from "@/components/table/table-mobile-infinite-scroll";
import type { TableMobileLayout } from "@/components/table/table-mobile-layout";
import type { useClientPagination } from "@/hooks/useClientPagination";

export type MobileTablePropsOptions<T> = {
  defaultLayout?: TableMobileLayout;
  titleColumnId?: string;
  detailTitle?: string | ((row: T) => string);
};

type ClientPaginationSlice<T> = Pick<
  ReturnType<typeof useClientPagination<T>>,
  "mobileItems" | "mobileHasMore" | "mobileLoadMore"
>;

/** ConfigurableTable 手机端 props：全局布局切换 + localStorage 持久化。 */
export function mobileTableProps<T>(options?: MobileTablePropsOptions<T>) {
  return {
    mobileLayout: options?.defaultLayout ?? ("list" as const),
    mobileLayoutToggle: true,
    mobileTitleColumnId: options?.titleColumnId,
    mobileDetailTitle: options?.detailTitle,
  };
}

/** 客户端分页：绑定手机端下滑累积加载。 */
export function mobileClientInfiniteScroll<T>(pagination: ClientPaginationSlice<T>): {
  mobileRows: T[];
  mobileInfiniteScroll: TableMobileInfiniteScrollProps;
} {
  return {
    mobileRows: pagination.mobileItems,
    mobileInfiniteScroll: {
      hasMore: pagination.mobileHasMore,
      onLoadMore: pagination.mobileLoadMore,
      loadedCount: pagination.mobileItems.length,
    },
  };
}

/** 服务端分页：绑定手机端下滑累积加载。 */
export function mobileServerInfiniteScroll<T>(
  mobileRows: T[],
  infiniteScroll: TableMobileInfiniteScrollProps,
): {
  mobileRows: T[];
  mobileInfiniteScroll: TableMobileInfiniteScrollProps;
} {
  return { mobileRows, mobileInfiniteScroll: infiniteScroll };
}
