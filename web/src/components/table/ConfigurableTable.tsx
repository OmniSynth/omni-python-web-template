import { type ReactNode, useMemo } from "react";
import { DataTable } from "@/components/layout/DataTable";
import { DesktopTableBody, DesktopTableHeader } from "@/components/table/configurable-table-desktop";
import { TableColumnGroup } from "@/components/table/table-column-group";
import {
  type ConfigurableTableMobileOptions,
  TableMobileView,
  useConfigurableTableMobileLayout,
} from "@/components/table/table-mobile-view";
import { TableActionOrderProvider } from "@/components/table/table-row-actions";
import { useDesktopTableColumns } from "@/components/table/use-desktop-table-columns";
import { useMobileTableViewport } from "@/hooks/use-mobile-table-viewport";
import { cn } from "@/lib/utils";
import type { ResolvedTableColumn, TableColumnPreference, TableSortPreference } from "@/types/table-preference";

export type { TableMobileLayout } from "@/components/table/table-mobile-layout";

interface ConfigurableTableProps<T> extends ConfigurableTableMobileOptions<T> {
  rows: T[];
  columns: ResolvedTableColumn<T>[];
  rowHeight: number;
  sort?: TableSortPreference | null;
  /** @deprecated 列宽由偏好列宽之和决定，该参数不再影响渲染宽度 */
  minWidth?: number;
  rowKey: (row: T) => string | number;
  onSort?: (columnId: string) => void;
  /**
   * PC 端表头拖拽松手：写入全部可见列当前像素宽（拖前会先物化按比例铺满结果，避免只改一列后又瓜分）。
   * 接入时传 `setColumnWidths`。
   */
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
  emptyMessage?: ReactNode;
  getRowClassName?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  /** 操作列偏好：按钮排序与直显个数（来自列偏好 actions） */
  actionsColumnPref?: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax">;
  /** @deprecated 请改用 actionsColumnPref */
  actionOrder?: string[];
}

/** 应用用户表格偏好的通用表格；lg 及以上为桌面表格，以下可选手机端卡片/列表。 */
export function ConfigurableTable<T>({
  rows,
  columns,
  rowHeight,
  sort,
  rowKey,
  onSort,
  onColumnWidthsChange,
  emptyMessage = "暂无数据",
  getRowClassName,
  onRowClick,
  actionsColumnPref,
  actionOrder,
  mobileLayout,
  mobileLayoutToggle,
  mobileTitleColumnId,
  mobileDetailTitle,
  mobileRows,
  mobileInfiniteScroll,
  mobileTotal,
}: ConfigurableTableProps<T>) {
  const { layout: mobileActiveLayout, enabled: mobileEnabled } = useConfigurableTableMobileLayout({
    mobileLayout,
    mobileLayoutToggle,
  });
  const isMobileViewport = useMobileTableViewport();
  const showMobileTable = mobileEnabled && isMobileViewport;
  const { desktopColumns, tableWidth, resizeEnabled, setContainerWidth, handleResizeStart } = useDesktopTableColumns(
    columns,
    onColumnWidthsChange,
  );
  const columnGroup = useMemo(() => <TableColumnGroup columns={desktopColumns} />, [desktopColumns]);

  return (
    <TableActionOrderProvider actionsColumnPref={actionsColumnPref ?? { actionOrder }}>
      {showMobileTable ? (
        <TableMobileView
          className="min-h-0 flex-1"
          rows={mobileRows ?? rows}
          columns={columns}
          rowKey={rowKey}
          emptyMessage={emptyMessage}
          layout={mobileActiveLayout}
          titleColumnId={mobileTitleColumnId}
          detailTitle={mobileDetailTitle}
          actionsColumnPref={actionsColumnPref}
          infiniteScroll={mobileInfiniteScroll}
          total={mobileTotal}
          sort={sort}
          onSort={onSort}
          onRowClick={onRowClick}
        />
      ) : null}
      <div className={cn("flex min-h-0 w-full flex-1 flex-col overscroll-none", showMobileTable && "hidden")}>
        <DataTable
          tableWidth={tableWidth}
          columnGroup={columnGroup}
          onContainerWidthChange={setContainerWidth}
          header={
            <DesktopTableHeader
              columns={desktopColumns}
              rowHeight={rowHeight}
              sort={sort}
              onSort={onSort}
              resizable={resizeEnabled}
              onResizeStart={handleResizeStart}
            />
          }
          body={
            <DesktopTableBody
              rows={rows}
              columns={desktopColumns}
              rowHeight={rowHeight}
              rowKey={rowKey}
              emptyMessage={emptyMessage}
              getRowClassName={getRowClassName}
              onRowClick={onRowClick}
            />
          }
        />
      </div>
    </TableActionOrderProvider>
  );
}
