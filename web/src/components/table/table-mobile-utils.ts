import { useAuth } from "@/contexts/AuthContext";
import {
  isActionColumn,
  type ResolvedTableColumn,
  resolveOrderedTableActionItems,
  type TableActionItem,
  type TableColumnPreference,
} from "@/types/table-preference";

export function splitMobileTableColumns<T>(columns: ResolvedTableColumn<T>[]) {
  const dataColumns = columns.filter((col) => col.visible !== false && !isActionColumn(col));
  const actionsColumn = columns.find((col) => isActionColumn(col));
  return { dataColumns, actionsColumn };
}

export function resolveMobileRowActionItems<T>(
  row: T,
  actionsColumn: ResolvedTableColumn<T> | undefined,
  actionsColumnPref: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax"> | undefined,
  hasPermission: (code: string) => boolean,
): TableActionItem[] {
  if (!actionsColumn?.resolveActionItems) return [];
  const items = actionsColumn
    .resolveActionItems(row)
    .filter((item) => !item.hidden && (!item.permission || hasPermission(item.permission)));
  return resolveOrderedTableActionItems(items, actionsColumnPref?.actionOrder);
}

export function resolveMobileTitleColumn<T>(
  columns: ResolvedTableColumn<T>[],
  titleColumnId?: string,
): ResolvedTableColumn<T> | undefined {
  if (titleColumnId) {
    return columns.find((col) => col.id === titleColumnId);
  }
  return columns[0];
}

export const MOBILE_MASONRY_GRID_COLS = 1;
export const MOBILE_MASONRY_GRID_MAX_ROWS = 6;
export const MOBILE_MASONRY_GRID_MAX_FIELDS = MOBILE_MASONRY_GRID_COLS * MOBILE_MASONRY_GRID_MAX_ROWS;

/** 手机端瀑布流卡片预览字段：按表格列顺序，最多 6 行（每行 1 列）。 */
export function resolveMobileMasonryPreviewColumns<T>(columns: ResolvedTableColumn<T>[]): ResolvedTableColumn<T>[] {
  return columns.slice(0, MOBILE_MASONRY_GRID_MAX_FIELDS);
}

export const MOBILE_LIST_GRID_COLS = 3;
export const MOBILE_LIST_GRID_MAX_ROWS = 6;
export const MOBILE_LIST_GRID_MAX_FIELDS = MOBILE_LIST_GRID_COLS * MOBILE_LIST_GRID_MAX_ROWS;

/** 手机端列表预览字段：按表格列顺序从左到右，最多 3 列 × 6 行。 */
export function resolveMobileListPreviewColumns<T>(columns: ResolvedTableColumn<T>[]): ResolvedTableColumn<T>[] {
  return columns.slice(0, MOBILE_LIST_GRID_MAX_FIELDS);
}

/** 手机端行点击：优先 onRowClick，否则触发操作列主操作（详情 > 编辑 > 首个）。 */
export function resolveMobilePrimaryRowAction<T>(
  row: T,
  actionsColumn: ResolvedTableColumn<T> | undefined,
  actionsColumnPref: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax"> | undefined,
  hasPermission: (code: string) => boolean,
): TableActionItem | undefined {
  const items = resolveMobileRowActionItems(row, actionsColumn, actionsColumnPref, hasPermission);
  if (items.length === 0) return undefined;
  return items.find((item) => item.id === "detail") ?? items.find((item) => item.id === "edit") ?? items[0];
}

export function invokeMobileRowClick<T>(
  row: T,
  options: {
    onRowClick?: (row: T) => void;
    actionsColumn?: ResolvedTableColumn<T>;
    actionsColumnPref?: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax">;
    hasPermission: (code: string) => boolean;
  },
): void {
  if (options.onRowClick) {
    options.onRowClick(row);
    return;
  }
  const primary = resolveMobilePrimaryRowAction(
    row,
    options.actionsColumn,
    options.actionsColumnPref,
    options.hasPermission,
  );
  primary?.onClick();
}

export function isMobileRowClickable<T>(
  row: T,
  options: {
    onRowClick?: (row: T) => void;
    actionsColumn?: ResolvedTableColumn<T>;
    actionsColumnPref?: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax">;
    hasPermission: (code: string) => boolean;
  },
): boolean {
  if (options.onRowClick) return true;
  return (
    resolveMobilePrimaryRowAction(row, options.actionsColumn, options.actionsColumnPref, options.hasPermission) !==
    undefined
  );
}

export function useMobileRowActionItems<T>(
  row: T,
  actionsColumn: ResolvedTableColumn<T> | undefined,
  actionsColumnPref: Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax"> | undefined,
): TableActionItem[] {
  const { hasPermission } = useAuth();
  return resolveMobileRowActionItems(row, actionsColumn, actionsColumnPref, hasPermission);
}
