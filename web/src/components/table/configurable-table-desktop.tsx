import type { CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { SortableTableHead } from "@/components/table/SortableTableHead";
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  isPinnedColumn,
  isPinRightColumn,
  type ResolvedTableColumn,
  resolveFirstPinRightColumnIndex,
  resolveLastPinnedColumnIndex,
  resolvePinnedColumnLeft,
  resolvePinnedColumnRight,
  type TableSortPreference,
} from "@/types/table-preference";

const DESKTOP_TABLE_HEADER_SURFACE_CLASS = "bg-table-header backdrop-blur-sm";
const DESKTOP_TABLE_ROW_SURFACE_CLASSES = [
  "bg-table-row backdrop-blur-sm",
  "bg-table-row-alt backdrop-blur-sm",
] as const;

function desktopTableRowSurfaceClass(rowIndex: number): string {
  return DESKTOP_TABLE_ROW_SURFACE_CLASSES[rowIndex % 2];
}

function stickyCellPresentation<T>(
  columns: ResolvedTableColumn<T>[],
  columnIndex: number,
  variant: "head" | "body",
  rowSurfaceClass = "bg-table-row backdrop-blur-sm",
): { className?: string; style?: CSSProperties } {
  const col = columns[columnIndex];
  const pinLeft = isPinnedColumn(col.pinned);
  const pinRight = isPinRightColumn(col);
  if (!pinLeft && !pinRight) return {};

  const style: CSSProperties = { position: "sticky" };
  if (pinLeft) {
    style.left = resolvePinnedColumnLeft(columns, columnIndex);
  }
  if (pinRight) {
    style.right = resolvePinnedColumnRight(columns, columnIndex);
  }
  style.zIndex = pinRight ? (variant === "head" ? 4 : 3) : variant === "head" ? 3 : 2;

  const lastLeftPinnedIndex = resolveLastPinnedColumnIndex(columns);
  const firstRightPinnedIndex = resolveFirstPinRightColumnIndex(columns);

  return {
    className: cn(
      variant === "body" ? rowSurfaceClass : DESKTOP_TABLE_HEADER_SURFACE_CLASS,
      pinLeft && columnIndex === lastLeftPinnedIndex && "shadow-[4px_0_8px_-4px] shadow-border/80",
      pinRight && columnIndex === firstRightPinnedIndex && "shadow-[-4px_0_8px_-4px] shadow-border/80",
    ),
    style,
  };
}

interface DesktopTableHeaderProps<T> {
  columns: ResolvedTableColumn<T>[];
  rowHeight: number;
  sort?: TableSortPreference | null;
  onSort?: (columnId: string) => void;
  resizable: boolean;
  onResizeStart: (col: ResolvedTableColumn<T>, event: ReactPointerEvent) => void;
}

/** PC 端表头：排序 + 列宽拖拽手柄。 */
export function DesktopTableHeader<T>({
  columns,
  rowHeight,
  sort,
  onSort,
  resizable,
  onResizeStart,
}: DesktopTableHeaderProps<T>) {
  return (
    <TableHeader className={DESKTOP_TABLE_HEADER_SURFACE_CLASS}>
      <TableRow style={{ height: rowHeight }}>
        {columns.map((col, columnIndex) => {
          const sticky = stickyCellPresentation(columns, columnIndex, "head");
          return (
            <SortableTableHead
              key={col.id}
              columnId={col.id}
              label={col.label}
              tip={col.tip}
              sort={sort}
              sortable={Boolean(col.sortKey && onSort)}
              className={cn(col.className, sticky.className)}
              style={sticky.style}
              onSort={() => onSort?.(col.id)}
              resizable={resizable}
              onResizeStart={(event) => onResizeStart(col, event)}
            />
          );
        })}
      </TableRow>
    </TableHeader>
  );
}

interface DesktopTableBodyProps<T> {
  rows: T[];
  columns: ResolvedTableColumn<T>[];
  rowHeight: number;
  rowKey: (row: T) => string | number;
  emptyMessage: ReactNode;
  getRowClassName?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
}

/** PC 端表体：隔行色与固定列。 */
export function DesktopTableBody<T>({
  rows,
  columns,
  rowHeight,
  rowKey,
  emptyMessage,
  getRowClassName,
  onRowClick,
}: DesktopTableBodyProps<T>) {
  return (
    <TableBody>
      {rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
            {emptyMessage}
          </TableCell>
        </TableRow>
      ) : (
        rows.map((row, rowIndex) => {
          const rowSurfaceClass = desktopTableRowSurfaceClass(rowIndex);
          return (
            <TableRow
              key={rowKey(row)}
              style={{ height: rowHeight }}
              className={cn(rowSurfaceClass, getRowClassName?.(row))}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col, columnIndex) => {
                const sticky = stickyCellPresentation(columns, columnIndex, "body", rowSurfaceClass);
                return (
                  <TableCell key={col.id} className={sticky.className} style={sticky.style}>
                    <div className={cn("w-full min-w-0 max-w-full whitespace-normal wrap-anywhere", col.className)}>
                      {col.render(row)}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })
      )}
    </TableBody>
  );
}
