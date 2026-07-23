import { type ReactNode, useMemo } from "react";
import type { TableMobileInfiniteScrollProps } from "@/components/table/table-mobile-infinite-scroll";
import type { TableMobileLayout } from "@/components/table/table-mobile-layout";
import { TableMobileListView } from "@/components/table/table-mobile-list-view";
import { TableMobileMasonryView } from "@/components/table/table-mobile-masonry-view";
import { TableMobileSortBar } from "@/components/table/table-mobile-sort-bar";
import { useMobileTableLayout } from "@/hooks/use-mobile-table-layout";
import { cn } from "@/lib/utils";
import type { ResolvedTableColumn, TableColumnPreference, TableSortPreference } from "@/types/table-preference";

export type TableMobileViewProps<T> = {
  rows: T[];
  columns: ResolvedTableColumn<T>[];
  rowKey: (row: T) => string | number;
  emptyMessage?: ReactNode;
  layout: TableMobileLayout;
  titleColumnId?: string;
  detailTitle?: string | ((row: T) => string);
  actionsColumnPref?: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax">;
  className?: string;
  infiniteScroll?: TableMobileInfiniteScrollProps;
  total?: number;
  sort?: TableSortPreference | null;
  onSort?: (columnId: string) => void;
  onRowClick?: (row: T) => void;
};

/** 手机端表格视图：瀑布流卡片 / 横向列表；行点击与桌面 onRowClick 一致。 */
export function TableMobileView<T>({
  rows,
  columns,
  rowKey,
  emptyMessage = "暂无数据",
  layout,
  titleColumnId,
  detailTitle,
  actionsColumnPref,
  className,
  infiniteScroll,
  total,
  sort,
  onSort,
  onRowClick,
}: TableMobileViewProps<T>) {
  const sharedProps = {
    rows,
    columns,
    rowKey,
    emptyMessage,
    titleColumnId,
    detailTitle,
    actionsColumnPref,
    infiniteScroll,
    total,
    onRowClick,
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <TableMobileSortBar columns={columns} sort={sort} onSort={onSort} />
      {layout === "masonry" ? <TableMobileMasonryView {...sharedProps} /> : <TableMobileListView {...sharedProps} />}
    </div>
  );
}

export type ConfigurableTableMobileOptions<T> = {
  mobileLayout?: TableMobileLayout;
  mobileLayoutToggle?: boolean;
  mobileTitleColumnId?: string;
  mobileDetailTitle?: string | ((row: T) => string);
  mobileRows?: T[];
  mobileInfiniteScroll?: TableMobileInfiniteScrollProps;
  mobileTotal?: number;
};

export function useConfigurableTableMobileLayout<T>(options: ConfigurableTableMobileOptions<T>) {
  const defaultLayout = options.mobileLayout ?? "list";
  const { layout, setLayout } = useMobileTableLayout(defaultLayout);
  const resolvedLayout = useMemo(
    () => (options.mobileLayoutToggle ? layout : defaultLayout),
    [defaultLayout, layout, options.mobileLayoutToggle],
  );
  return { layout: resolvedLayout, setLayout, enabled: Boolean(options.mobileLayout) };
}
