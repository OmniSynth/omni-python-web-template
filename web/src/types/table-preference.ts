/** 表格列偏好类型与工具。 */

import type { ReactNode } from "react";

export type SortOrder = "asc" | "desc";

export interface TableSortPreference {
  columnId: string;
  order: SortOrder;
}

export interface TableColumnPreference {
  visible: boolean;
  pinned?: boolean;
  /** 横向滚动时固定于右侧（操作列默认 true，可关闭） */
  pinRight?: boolean;
  width?: number;
  label?: string;
  tip?: string;
  order: number;
  /** 操作列按钮 id 排序（仅 actions 列） */
  actionOrder?: string[];
  /** 操作列直接展示的按钮数；总数 ≤ 该值 + 1 时全部直显，否则其余收入「更多」（仅 actions 列） */
  actionInlineVisibleMax?: number;
}

export interface TableActionDef {
  id: string;
  label: string;
}

export interface TableActionItem {
  id: string;
  label: string;
  permission?: string;
  disabled?: boolean;
  hidden?: boolean;
  onClick: () => void;
}

/** 操作列直显按钮数默认值（总数 ≤ 3 时全部直显，> 3 时第 3 个及之后收入「更多」）。 */
export const TABLE_ACTION_INLINE_VISIBLE_MAX_DEFAULT = 2;
export const TABLE_ACTION_INLINE_VISIBLE_MAX_MIN = 1;
export const TABLE_ACTION_INLINE_VISIBLE_MAX_MAX = 9;

/** 规范化操作列直显按钮数偏好。 */
export function resolveTableActionInlineVisibleMax(value: number | undefined): number {
  const raw = value ?? TABLE_ACTION_INLINE_VISIBLE_MAX_DEFAULT;
  return Math.max(TABLE_ACTION_INLINE_VISIBLE_MAX_MIN, Math.min(TABLE_ACTION_INLINE_VISIBLE_MAX_MAX, Math.round(raw)));
}

/** 分割直接展示与「更多」内的操作按钮。总数 ≤ inlineMax + 1 时全部直显。 */
export function splitTableActionItems(
  items: TableActionItem[],
  inlineMax?: number,
): { inline: TableActionItem[]; folded: TableActionItem[] } {
  const max = resolveTableActionInlineVisibleMax(inlineMax);
  if (items.length <= max + 1) {
    return { inline: items, folded: [] };
  }
  return { inline: items.slice(0, max), folded: items.slice(max) };
}

export interface TablePreferenceConfig {
  version: 1;
  rowHeight: number;
  sort?: TableSortPreference | null;
  columns: Record<string, TableColumnPreference>;
}

export interface TablePreferenceRecord {
  page_key: string;
  table_key: string;
  config: TablePreferenceConfig;
  updated_at: string;
}

/** GET 响应：无记录时 config 为 null。 */
export interface TablePreferenceGetResponse {
  page_key: string;
  table_key: string;
  config: TablePreferenceConfig | null;
  updated_at: string | null;
}

export interface TableColumnDef<T> {
  id: string;
  label: string;
  defaultWidth?: number;
  defaultTip?: string;
  sortKey?: string;
  /** 不在设置抽屉展示（操作列 `actions` 除外，始终可配置） */
  hideInSettings?: boolean;
  /** 横向滚动时固定于右侧；`actions` 列默认启用 */
  pinRight?: boolean;
  className?: string;
  /** 操作列可配置按钮清单（仅 actions 列） */
  actionDefs?: TableActionDef[];
  /** 操作列原始按钮列表（仅 actions 列；手机端行内操作用） */
  resolveActionItems?: (row: T) => TableActionItem[];
  render: (row: T) => ReactNode;
}

export interface ResolvedTableColumn<T> extends TableColumnDef<T> {
  width?: number;
  tip?: string;
  visible: boolean;
  pinned?: boolean;
  pinRight?: boolean;
  order: number;
}

export const ACTION_COLUMN_ID = "actions";

export const DEFAULT_ROW_HEIGHT = 36;
export const DEFAULT_COLUMN_WIDTH = 120;
export const MIN_COLUMN_WIDTH = 40;

/** 单列像素宽：与设置抽屉「列宽（px）」一致。 */
export function resolveColumnPixelWidth(width?: number, defaultWidth?: number): number {
  const raw = width ?? defaultWidth ?? DEFAULT_COLUMN_WIDTH;
  return Math.max(MIN_COLUMN_WIDTH, Math.round(raw));
}

/** 表格总宽 = 可见列宽之和。 */
export function resolveTablePixelWidth(columns: Array<{ width?: number; defaultWidth?: number }>): number {
  if (columns.length === 0) return DEFAULT_COLUMN_WIDTH;
  return columns.reduce((sum, col) => sum + resolveColumnPixelWidth(col.width, col.defaultWidth), 0);
}

/**
 * 列宽之和小于容器时按偏好比例瓜分容器宽度；之和 ≥ 容器时保持绝对像素（可横向滚动）。
 * 舍入误差补到最后一列。
 */
export function distributeTableColumnWidths<T extends { width?: number; defaultWidth?: number }>(
  columns: T[],
  containerWidth: number,
): Array<T & { width: number }> {
  if (columns.length === 0) return [];
  const prefs = columns.map((col) => resolveColumnPixelWidth(col.width, col.defaultWidth));
  const sum = prefs.reduce((acc, w) => acc + w, 0);
  if (containerWidth <= 0 || sum <= 0 || sum >= containerWidth) {
    return columns.map((col, index) => ({ ...col, width: prefs[index] }));
  }
  const scaled = prefs.map((w) => (w * containerWidth) / sum);
  const widths = scaled.map((w) => Math.max(MIN_COLUMN_WIDTH, Math.round(w)));
  const drift = containerWidth - widths.reduce((acc, w) => acc + w, 0);
  const last = widths.length - 1;
  widths[last] = Math.max(MIN_COLUMN_WIDTH, widths[last] + drift);
  return columns.map((col, index) => ({ ...col, width: widths[index] }));
}

/** 固定列横向 sticky 偏移（按当前列顺序累加左侧列宽）。 */
export function resolvePinnedColumnLeft(
  columns: Array<{ width?: number; defaultWidth?: number }>,
  columnIndex: number,
): number {
  return columns
    .slice(0, columnIndex)
    .reduce((sum, col) => sum + resolveColumnPixelWidth(col.width, col.defaultWidth), 0);
}

export function isPinnedColumn(pinned?: boolean): boolean {
  return pinned === true;
}

export function resolveLastPinnedColumnIndex(columns: Array<{ pinned?: boolean }>): number {
  let last = -1;
  columns.forEach((col, index) => {
    if (isPinnedColumn(col.pinned)) last = index;
  });
  return last;
}

export function isActionColumn(col: { id: string }): boolean {
  return col.id === ACTION_COLUMN_ID;
}

export function isPinRightColumn(col: { pinRight?: boolean }): boolean {
  return col.pinRight === true;
}

/** 列定义默认是否右侧固定（操作列默认 true）。 */
export function defaultColumnPinRight(col: { id: string; pinRight?: boolean }): boolean {
  if (isActionColumn(col)) return col.pinRight !== false;
  return col.pinRight === true;
}

export function isSettingsEditableColumn(col: TableColumnDef<unknown>): boolean {
  return !col.hideInSettings || isActionColumn(col);
}

/** 固定列横向 sticky 右偏移（按当前列右侧列宽累加）。 */
export function resolvePinnedColumnRight(
  columns: Array<{ width?: number; defaultWidth?: number }>,
  columnIndex: number,
): number {
  return columns
    .slice(columnIndex + 1)
    .reduce((sum, col) => sum + resolveColumnPixelWidth(col.width, col.defaultWidth), 0);
}

export function resolveFirstPinRightColumnIndex(columns: Array<{ pinRight?: boolean; id: string }>): number {
  return columns.findIndex((col) => isPinRightColumn(col));
}

export function normalizeColumnOrderIds(ids: string[], actionIds: readonly string[]): string[] {
  if (actionIds.length === 0) return ids;
  const actionSet = new Set(actionIds);
  return [...ids.filter((id) => !actionSet.has(id)), ...ids.filter((id) => actionSet.has(id))];
}

export function resolveActionColumnIds<T>(columns: TableColumnDef<T>[]): string[] {
  return columns.filter(isActionColumn).map((col) => col.id);
}

export function normalizeResolvedColumnOrder<T>(columns: ResolvedTableColumn<T>[]): ResolvedTableColumn<T>[] {
  const scrollable = columns.filter((col) => !isPinRightColumn(col));
  const pinnedRight = columns.filter((col) => isPinRightColumn(col));
  return [...scrollable, ...pinnedRight];
}

/** 设置抽屉字段名模糊匹配（列名、自定义列名、字段 id）。 */
export function matchTableColumnKeyword(
  def: { id: string; label: string },
  pref: TableColumnPreference | undefined,
  keyword: string,
): boolean {
  const query = keyword.trim().toLowerCase();
  if (!query) return true;
  const label = (pref?.label?.trim() || def.label).toLowerCase();
  return label.includes(query) || def.id.toLowerCase().includes(query);
}

/** 单列偏好规范化，确保 pinned 等字段读写一致。 */
export function normalizeTableColumnPreference(
  raw: TableColumnPreference | Record<string, unknown> | undefined,
): TableColumnPreference {
  if (!raw || typeof raw !== "object") {
    return { visible: true, order: 0 };
  }
  const pref = raw as Record<string, unknown>;
  const width = pref.width;
  return {
    visible: pref.visible !== false,
    pinned: pref.pinned === true,
    order: typeof pref.order === "number" ? pref.order : 0,
    ...(pref.pinRight !== undefined && pref.pinRight !== null ? { pinRight: pref.pinRight === true } : {}),
    ...(typeof width === "number" && width > 0 ? { width } : {}),
    ...(typeof pref.label === "string" && pref.label.trim() ? { label: pref.label.trim() } : {}),
    ...(typeof pref.tip === "string" && pref.tip.trim() ? { tip: pref.tip.trim() } : {}),
    ...(Array.isArray(pref.actionOrder)
      ? {
          actionOrder: pref.actionOrder.filter((id): id is string => typeof id === "string" && id.length > 0),
        }
      : {}),
    ...(typeof pref.actionInlineVisibleMax === "number" && Number.isFinite(pref.actionInlineVisibleMax)
      ? { actionInlineVisibleMax: resolveTableActionInlineVisibleMax(pref.actionInlineVisibleMax) }
      : {}),
  };
}

/** 持久化前规范化，避免 pinned 等字段在序列化/合并时丢失。 */
export function serializeTablePreferenceConfig(config: TablePreferenceConfig): TablePreferenceConfig {
  const columns: Record<string, TableColumnPreference> = {};
  for (const [id, pref] of Object.entries(config.columns ?? {})) {
    columns[id] = normalizeTableColumnPreference(pref);
  }
  return {
    version: 1,
    rowHeight: config.rowHeight,
    sort: config.sort ?? null,
    columns,
  };
}

/** 规范化表格偏好配置。 */
export function normalizeTablePreferenceConfig(
  saved: TablePreferenceConfig | Record<string, unknown>,
): TablePreferenceConfig {
  const raw = saved as Record<string, unknown>;
  const sortRaw = raw.sort as Record<string, unknown> | null | undefined;
  let sort: TableSortPreference | null = null;
  if (sortRaw && typeof sortRaw === "object") {
    const columnId = sortRaw.columnId;
    if (typeof columnId === "string" && columnId.length > 0) {
      sort = { columnId, order: sortRaw.order === "desc" ? "desc" : "asc" };
    }
  }
  const rawColumns = (raw.columns ?? {}) as Record<string, TableColumnPreference | Record<string, unknown>>;
  const columns: Record<string, TableColumnPreference> = {};
  for (const [id, pref] of Object.entries(rawColumns)) {
    columns[id] = normalizeTableColumnPreference(pref);
  }
  return {
    version: 1,
    rowHeight: Number(raw.rowHeight ?? DEFAULT_ROW_HEIGHT),
    sort,
    columns,
  };
}

export function buildDefaultConfig<T>(
  columns: TableColumnDef<T>[],
  rowHeight = DEFAULT_ROW_HEIGHT,
): TablePreferenceConfig {
  const scrollable = columns.filter((col) => !defaultColumnPinRight(col));
  const pinnedRight = columns.filter((col) => defaultColumnPinRight(col));
  const ordered = [...scrollable, ...pinnedRight];
  const colMap: Record<string, TableColumnPreference> = {};
  ordered.forEach((col, index) => {
    const pref: TableColumnPreference = {
      visible: true,
      order: index,
      width: col.defaultWidth,
    };
    if (defaultColumnPinRight(col)) {
      pref.pinRight = true;
    }
    if (isActionColumn(col) && col.actionDefs?.length) {
      pref.actionOrder = col.actionDefs.map((def) => def.id);
    }
    colMap[col.id] = pref;
  });
  return { version: 1, rowHeight, sort: null, columns: colMap };
}

export function mergePreferenceConfig<T>(
  defaults: TableColumnDef<T>[],
  saved: TablePreferenceConfig | Record<string, unknown> | null,
  rowHeightDefault = DEFAULT_ROW_HEIGHT,
): TablePreferenceConfig {
  const base = buildDefaultConfig(defaults, rowHeightDefault);
  if (!saved) return base;
  const normalized = normalizeTablePreferenceConfig(saved);
  const mergedColumns: Record<string, TableColumnPreference> = { ...base.columns };
  for (const [id, pref] of Object.entries(normalized.columns)) {
    if (!mergedColumns[id]) continue;
    const colDef = defaults.find((col) => col.id === id);
    let merged = normalizeTableColumnPreference({ ...mergedColumns[id], ...pref });
    if (colDef && isActionColumn(colDef) && colDef.actionDefs?.length) {
      merged = {
        ...merged,
        actionOrder: mergeActionOrder(
          merged.actionOrder,
          colDef.actionDefs.map((def) => def.id),
        ),
      };
    }
    mergedColumns[id] = merged;
  }
  return serializeTablePreferenceConfig({
    version: 1,
    rowHeight: normalized.rowHeight ?? rowHeightDefault,
    sort: normalized.sort ?? null,
    columns: mergedColumns,
  });
}

export function resolveColumns<T>(
  defaults: TableColumnDef<T>[],
  config: TablePreferenceConfig,
): ResolvedTableColumn<T>[] {
  const result: ResolvedTableColumn<T>[] = [];
  for (const col of defaults) {
    const pref = config.columns[col.id];
    if (col.hideInSettings && !isActionColumn(col)) {
      result.push({
        ...col,
        visible: true,
        order: pref?.order ?? 9999,
        width: pref?.width ?? col.defaultWidth,
        tip: pref?.tip ?? col.defaultTip,
        pinned: pref?.pinned ?? false,
        pinRight: false,
      });
      continue;
    }

    const actionColumn = isActionColumn(col);
    if (!actionColumn && pref && !pref.visible) continue;

    const p = pref ?? { visible: true, order: result.length };
    const pinRight = p.pinRight ?? defaultColumnPinRight(col);
    result.push({
      ...col,
      label: p.label?.trim() || col.label,
      width: p.width ?? col.defaultWidth,
      tip: p.tip ?? col.defaultTip,
      visible: p.visible !== false,
      pinned: actionColumn ? false : (p.pinned ?? false),
      pinRight,
      order: p.order,
    });
  }
  return normalizeResolvedColumnOrder(result.sort((a, b) => a.order - b.order));
}

export function cycleSortState(
  current: TableSortPreference | null | undefined,
  columnId: string,
): TableSortPreference | null {
  if (!current || current.columnId !== columnId) {
    return { columnId, order: "asc" };
  }
  if (current.order === "asc") return { columnId, order: "desc" };
  return null;
}

export function sortRows<T>(
  rows: T[],
  sort: TableSortPreference | null | undefined,
  columns: TableColumnDef<T>[],
): T[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.columnId);
  const key = col?.sortKey ?? sort.columnId;
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = (a as Record<string, unknown>)[key];
    const bv = (b as Record<string, unknown>)[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") {
      return sort.order === "asc" ? av - bv : bv - av;
    }
    if (typeof av === "boolean" && typeof bv === "boolean") {
      return sort.order === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    }
    const as = String(av);
    const bs = String(bv);
    return sort.order === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
  return copy;
}

export function preferenceStorageKey(userId: number, pageKey: string, tableKey: string): string {
  return `${userId}:${pageKey}:${tableKey}`;
}

/** 合并已保存与默认的操作按钮顺序。 */
export function mergeActionOrder(saved: string[] | undefined, defaultIds: readonly string[]): string[] {
  if (defaultIds.length === 0) return [];
  if (!saved?.length) return [...defaultIds];
  const allowed = new Set(defaultIds);
  const merged = saved.filter((id) => allowed.has(id));
  for (const id of defaultIds) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

/** 按偏好顺序排列可见操作按钮。 */
export function resolveOrderedTableActionItems(
  items: TableActionItem[],
  actionOrder: string[] | undefined,
): TableActionItem[] {
  if (!actionOrder?.length) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered: TableActionItem[] = [];
  for (const id of actionOrder) {
    const item = byId.get(id);
    if (item) ordered.push(item);
  }
  for (const item of items) {
    if (!ordered.some((row) => row.id === item.id)) ordered.push(item);
  }
  return ordered;
}
