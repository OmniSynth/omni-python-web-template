import { type PointerEvent as ReactPointerEvent, useCallback, useMemo, useRef, useState } from "react";
import { useTableColumnResize } from "@/components/table/use-table-column-resize";
import {
  distributeTableColumnWidths,
  type ResolvedTableColumn,
  resolveColumnPixelWidth,
  resolveTablePixelWidth,
} from "@/types/table-preference";

function applyWidthMap<T>(columns: ResolvedTableColumn<T>[], widths: Record<string, number>): ResolvedTableColumn<T>[] {
  return columns.map((col) => ({
    ...col,
    width: widths[col.id] ?? resolveColumnPixelWidth(col.width, col.defaultWidth),
  }));
}

function applyResizePreview<T>(
  columns: ResolvedTableColumn<T>[],
  preview: { columnId: string; width: number } | null,
): ResolvedTableColumn<T>[] {
  if (!preview) return columns;
  return columns.map((col) => (col.id === preview.columnId ? { ...col, width: preview.width } : col));
}

/** 桌面列宽：不足容器按比例铺满；拖拽时物化为绝对像素。 */
export function useDesktopTableColumns<T>(
  columns: ResolvedTableColumn<T>[],
  onColumnWidthsChange?: (widths: Record<string, number>) => void,
) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [dragWidths, setDragWidths] = useState<Record<string, number> | null>(null);
  const dragWidthsRef = useRef<Record<string, number> | null>(null);
  dragWidthsRef.current = dragWidths;

  const handleResizeCommit = useCallback(
    (columnId: string, width: number) => {
      const next = { ...(dragWidthsRef.current ?? {}), [columnId]: width };
      setDragWidths(null);
      onColumnWidthsChange?.(next);
    },
    [onColumnWidthsChange],
  );

  const {
    preview: resizePreview,
    startResize,
    enabled: resizeEnabled,
  } = useTableColumnResize({
    onCommit: onColumnWidthsChange ? handleResizeCommit : undefined,
    onCancel: () => setDragWidths(null),
  });

  const visibleColumns = useMemo(() => columns.filter((col) => col.visible !== false), [columns]);

  const desktopColumns = useMemo(() => {
    if (dragWidths) {
      return applyResizePreview(applyWidthMap(visibleColumns, dragWidths), resizePreview);
    }
    return distributeTableColumnWidths(visibleColumns, containerWidth);
  }, [visibleColumns, containerWidth, dragWidths, resizePreview]);

  const tableWidth = useMemo(() => resolveTablePixelWidth(desktopColumns), [desktopColumns]);

  const handleResizeStart = useCallback(
    (col: ResolvedTableColumn<T>, event: ReactPointerEvent) => {
      const freeze = Object.fromEntries(
        desktopColumns.map((item) => [item.id, resolveColumnPixelWidth(item.width, item.defaultWidth)]),
      );
      setDragWidths(freeze);
      startResize(col.id, freeze[col.id] ?? resolveColumnPixelWidth(col.width, col.defaultWidth), event);
    },
    [desktopColumns, startResize],
  );

  return {
    desktopColumns,
    tableWidth,
    resizeEnabled,
    setContainerWidth,
    handleResizeStart,
  };
}
