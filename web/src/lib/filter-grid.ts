import type { CSSProperties, ReactNode } from "react";

/** 将筛选项按行切分。 */
export function chunkFilterFields(fields: ReactNode[], colsPerRow: number): ReactNode[][] {
  if (colsPerRow <= 0) return [fields];
  const rows: ReactNode[][] = [];
  for (let i = 0; i < fields.length; i += colsPerRow) {
    rows.push(fields.slice(i, i + colsPerRow));
  }
  return rows;
}

/** 解析当前视口下单行栅格上限。手机端始终 1 列（每字段占满一行）。 */
export function resolveFilterColsPerRow(isMobile: boolean, maxColsPerRow: number): number {
  if (isMobile) return 1;
  return maxColsPerRow;
}

export interface FilterToolbarRowLayout {
  /** 与功能按钮不同行的字段：末字段跨列至操作列右缘。 */
  stretchRows: ReactNode[][];
  /** 与右侧功能按钮同排对齐的末行字段；null 表示无独立操作列。 */
  actionRowFields: ReactNode[] | null;
}

/**
 * 按布局角色拆分字段行。
 * - stretch 行：与操作列不同排，前几列固定 1fr，末字段跨列至查询按钮右缘
 * - action 行：与操作列同排；展开态单字段占第 1 列，多字段最多第 3 列
 */
export function resolveFilterToolbarRowLayout(
  fieldRows: ReactNode[][],
  options: {
    showActionBar: boolean;
    mobileExpandedLayout: boolean;
  },
): FilterToolbarRowLayout {
  const { showActionBar, mobileExpandedLayout } = options;

  if (fieldRows.length === 0) {
    return { stretchRows: [], actionRowFields: null };
  }

  if (!showActionBar || mobileExpandedLayout) {
    return { stretchRows: fieldRows, actionRowFields: null };
  }

  if (fieldRows.length === 1) {
    return { stretchRows: [], actionRowFields: fieldRows[0] ?? null };
  }

  return {
    stretchRows: fieldRows.slice(0, -1),
    actionRowFields: fieldRows[fieldRows.length - 1] ?? null,
  };
}

/** 功能按钮同排字段行最多占用的栅格列数（展开态）。 */
export const FILTER_ACTION_ROW_MAX_COLS = 3;

/** 筛选工具栏桌面栅格：N 列字段 + 操作列。 */
export function filterToolbarGridStyle(colsPerRow: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${colsPerRow}, minmax(0, 1fr)) auto`,
  };
}

/** @deprecated 使用 filterToolbarGridStyle 统一栅格 */
export function filterActionRowGridStyle(maxColsPerRow: number): CSSProperties {
  return filterToolbarGridStyle(maxColsPerRow);
}

/**
 * 解析 action 行字段的 grid-column（1-based）。
 * 展开态：单字段占第 1 列（右缘与 stretch 首列对齐）；多字段最多至第 3 列。
 * 折叠态（无 stretch 行）：占满标准 maxCols 栅格。
 */
export function resolveActionFieldGridColumn(
  fieldIndex: number,
  fieldCount: number,
  maxColsPerRow: number,
  hasStretchRows: boolean,
): number {
  if (!hasStretchRows) {
    return fieldIndex + 1;
  }
  const cappedCount = Math.min(fieldCount, FILTER_ACTION_ROW_MAX_COLS, maxColsPerRow);
  if (cappedCount <= 0) return fieldIndex + 1;
  return Math.min(fieldIndex + 1, cappedCount);
}

/** action 行字段数量上限（展开态）。 */
export function resolveActionFieldRenderCount(fieldCount: number, hasStretchRows: boolean): number {
  if (!hasStretchRows) return fieldCount;
  return Math.min(fieldCount, FILTER_ACTION_ROW_MAX_COLS);
}

/**
 * 解析 stretch 行字段的 grid-column。
 * 非末字段占固定 1fr 列；末字段从当前列跨至栅格末尾（对齐查询按钮右缘）。
 */
export function resolveStretchFieldGridColumn(fieldIndex: number, fieldCount: number): number | string {
  if (fieldCount <= 0) return fieldIndex + 1;
  if (fieldIndex === fieldCount - 1) {
    return `${fieldIndex + 1} / -1`;
  }
  return fieldIndex + 1;
}
