import { type ReactNode, useMemo } from "react";
import type { TableMobileInfiniteScrollProps } from "@/components/table/table-mobile-infinite-scroll";
import { MobilePreviewFieldCell } from "@/components/table/table-mobile-preview-field";
import { TableMobileScrollArea } from "@/components/table/table-mobile-scroll-area";
import {
  invokeMobileRowClick,
  isMobileRowClickable,
  resolveMobileListPreviewColumns,
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

type MobileListRowGridProps<T> = {
  row: T;
  previewColumns: ResolvedTableColumn<T>[];
};

function MobileListRowGrid<T>({ row, previewColumns }: MobileListRowGridProps<T>) {
  return (
    <div className="grid w-full grid-cols-3 gap-x-2 gap-y-2">
      {previewColumns.map((col) => (
        <MobilePreviewFieldCell key={col.id} label={col.label}>
          {col.render(row)}
        </MobilePreviewFieldCell>
      ))}
    </div>
  );
}

/** 手机端列表：每行 3 列、最多 6 行字段预览；点击行与桌面 onRowClick 一致。 */
export function TableMobileListView<T>({
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
  const previewColumns = useMemo(() => resolveMobileListPreviewColumns(dataColumns), [dataColumns]);

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
      <div className="flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const clickable = isMobileRowClickable(row, rowClickOptions);
          const actionItems = actionsColumn?.resolveActionItems?.(row) ?? [];

          return (
            <div key={rowKey(row)} className="px-3 py-3">
              <button
                type="button"
                disabled={!clickable}
                className={cn(
                  "w-full text-left",
                  clickable && "transition-colors hover:bg-muted/40 active:bg-muted/60",
                  !clickable && "cursor-default",
                )}
                onClick={() => invokeMobileRowClick(row, rowClickOptions)}
              >
                <MobileListRowGrid row={row} previewColumns={previewColumns} />
              </button>
              {actionItems.length > 0 ? (
                <div className="mt-2 flex justify-end" role="presentation" onClick={(event) => event.stopPropagation()}>
                  <TableRowActions items={actionItems} variant="mobile" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </TableMobileScrollArea>
  );
}
