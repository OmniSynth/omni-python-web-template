import { type ReactNode, useMemo } from "react";
import type { TableMobileInfiniteScrollProps } from "@/components/table/table-mobile-infinite-scroll";
import { MobilePreviewFieldCell } from "@/components/table/table-mobile-preview-field";
import { TableMobileScrollArea } from "@/components/table/table-mobile-scroll-area";
import {
  invokeMobileRowClick,
  isMobileRowClickable,
  resolveMobileMasonryPreviewColumns,
  splitMobileTableColumns,
} from "@/components/table/table-mobile-utils";
import { TableRowActions } from "@/components/table/table-row-actions";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { ResolvedTableColumn, TableColumnPreference } from "@/types/table-preference";

type TableMobileRowsProps<T> = {
  rows: T[];
  columns: ResolvedTableColumn<T>[];
  rowKey: (row: T) => string | number;
  emptyMessage?: ReactNode;
  titleColumnId?: string;
  detailTitle?: string | ((row: T) => string);
  actionsColumnPref?: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax">;
  infiniteScroll?: TableMobileInfiniteScrollProps;
  total?: number;
  onRowClick?: (row: T) => void;
};

type MobileCardFieldGridProps<T> = {
  row: T;
  previewColumns: ResolvedTableColumn<T>[];
};

function splitMasonryRows<T>(rows: T[]): { leftColumn: T[]; rightColumn: T[] } {
  const leftColumn: T[] = [];
  const rightColumn: T[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    if (index % 2 === 0) leftColumn.push(rows[index]);
    else rightColumn.push(rows[index]);
  }
  return { leftColumn, rightColumn };
}

function MobileCardFieldGrid<T>({ row, previewColumns }: MobileCardFieldGridProps<T>) {
  return (
    <div className="flex flex-col gap-y-1">
      {previewColumns.map((col) => (
        <MobilePreviewFieldCell key={col.id} label={col.label}>
          {col.render(row)}
        </MobilePreviewFieldCell>
      ))}
    </div>
  );
}

type MobileMasonryCardProps<T> = {
  row: T;
  previewColumns: ResolvedTableColumn<T>[];
  rowClickOptions: {
    onRowClick?: (row: T) => void;
    actionsColumn?: ResolvedTableColumn<T>;
    actionsColumnPref?: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax">;
    hasPermission: (code: string) => boolean;
  };
};

function MobileMasonryCard<T>({ row, previewColumns, rowClickOptions }: MobileMasonryCardProps<T>) {
  const clickable = isMobileRowClickable(row, rowClickOptions);
  const actionItems = rowClickOptions.actionsColumn?.resolveActionItems?.(row) ?? [];

  return (
    <div
      className={cn(
        "surface-glass w-full break-inside-avoid rounded-md border border-border p-3",
        clickable && "transition-colors hover:bg-muted/40 active:bg-muted/60",
      )}
    >
      <button
        type="button"
        disabled={!clickable}
        className={cn("w-full text-left", !clickable && "cursor-default")}
        onClick={() => invokeMobileRowClick(row, rowClickOptions)}
      >
        <MobileCardFieldGrid row={row} previewColumns={previewColumns} />
      </button>
      {actionItems.length > 0 ? (
        <div className="mt-2 flex justify-end" onClick={(event) => event.stopPropagation()}>
          <TableRowActions items={actionItems} variant="mobile" />
        </div>
      ) : null}
    </div>
  );
}

/** 手机端双列瀑布流卡片：左右优先排列；点击卡片与桌面 onRowClick 一致。 */
export function TableMobileMasonryView<T>({
  rows,
  columns,
  rowKey,
  emptyMessage = "暂无数据",
  actionsColumnPref,
  infiniteScroll,
  total,
  onRowClick,
}: TableMobileRowsProps<T>) {
  const { hasPermission } = useAuth();
  const { dataColumns, actionsColumn } = useMemo(() => splitMobileTableColumns(columns), [columns]);
  const previewColumns = useMemo(() => resolveMobileMasonryPreviewColumns(dataColumns), [dataColumns]);
  const { leftColumn, rightColumn } = useMemo(() => splitMasonryRows(rows), [rows]);

  const rowClickOptions = useMemo(
    () => ({ onRowClick, actionsColumn, actionsColumnPref, hasPermission }),
    [actionsColumn, actionsColumnPref, hasPermission, onRowClick],
  );

  if (rows.length === 0 && !infiniteScroll?.loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <TableMobileScrollArea infiniteScroll={infiniteScroll} total={total}>
      <div className="flex gap-1 px-0 pb-0.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {leftColumn.map((row) => (
            <MobileMasonryCard
              key={rowKey(row)}
              row={row}
              previewColumns={previewColumns}
              rowClickOptions={rowClickOptions}
            />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {rightColumn.map((row) => (
            <MobileMasonryCard
              key={rowKey(row)}
              row={row}
              previewColumns={previewColumns}
              rowClickOptions={rowClickOptions}
            />
          ))}
        </div>
      </div>
    </TableMobileScrollArea>
  );
}
