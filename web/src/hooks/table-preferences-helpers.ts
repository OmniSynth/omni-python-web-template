import type { RefObject } from "react";
import { deleteTablePreferenceCache, readTablePreferenceCache, writeTablePreferenceCache } from "@/db/table-pref-repo";
import { api } from "@/lib/api";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type {
  TableColumnDef,
  TableColumnPreference,
  TablePreferenceConfig,
  TableSortPreference,
} from "@/types/table-preference";
import {
  buildDefaultConfig,
  cycleSortState,
  DEFAULT_ROW_HEIGHT,
  isActionColumn,
  mergePreferenceConfig,
  normalizeColumnOrderIds,
  resolveActionColumnIds,
  resolveColumnPixelWidth,
  serializeTablePreferenceConfig,
} from "@/types/table-preference";

export function columnsSignature<T>(columns: TableColumnDef<T>[]): string {
  return columns.map((c) => `${c.id}:${c.label}:${c.defaultWidth ?? ""}:${c.sortKey ?? ""}`).join("|");
}

export async function writeTablePreferenceCacheEntry(
  userId: number,
  pageKey: string,
  tableKey: string,
  next: TablePreferenceConfig,
  updatedAt: string,
) {
  await writeTablePreferenceCache(userId, pageKey, tableKey, {
    config: next,
    updatedAt,
    syncedAt: new Date().toISOString(),
  });
}

export function scheduleTablePreferenceSave(
  saveTimer: RefObject<number | null>,
  pageKey: string,
  tableKey: string,
  next: TablePreferenceConfig,
  writeCache: (next: TablePreferenceConfig, updatedAt: string) => Promise<void>,
) {
  if (saveTimer.current != null) window.clearTimeout(saveTimer.current);
  const payload = serializeTablePreferenceConfig(next);
  saveTimer.current = window.setTimeout(() => {
    void api.tablePreferences
      .save(pageKey, tableKey, payload)
      .then(async (record) => {
        await writeCache(payload, record.updated_at);
      })
      .catch((err) => {
        showToastError(errorMessage(err, "表格偏好保存失败"));
      });
  }, 500);
}

/** 立即写入 API，避免固定/显隐等变更在 debounce 前刷新丢失。 */
export async function flushTablePreferenceSave(
  saveTimer: RefObject<number | null>,
  pageKey: string,
  tableKey: string,
  next: TablePreferenceConfig,
  writeCache: (next: TablePreferenceConfig, updatedAt: string) => Promise<void>,
) {
  if (saveTimer.current != null) {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
  }
  const payload = serializeTablePreferenceConfig(next);
  try {
    const record = await api.tablePreferences.save(pageKey, tableKey, payload);
    await writeCache(payload, record.updated_at);
  } catch (err) {
    showToastError(errorMessage(err, "表格偏好保存失败"));
  }
}

export async function loadTablePreferences<T>({
  userId,
  pageKey,
  tableKey,
  defaultColumns,
  defaultRowHeight,
  writeCache,
  isActive,
  onConfig,
  onReady,
}: {
  userId: number;
  pageKey: string;
  tableKey: string;
  defaultColumns: TableColumnDef<T>[];
  defaultRowHeight: number;
  writeCache: (next: TablePreferenceConfig, updatedAt: string) => Promise<void>;
  isActive: () => boolean;
  onConfig: (config: TablePreferenceConfig) => void;
  onReady: () => void;
}) {
  const defaults = buildDefaultConfig(defaultColumns, defaultRowHeight);
  const cached = await readTablePreferenceCache(userId, pageKey, tableKey);
  if (!isActive()) return;

  if (cached) {
    onConfig(mergePreferenceConfig(defaultColumns, cached.config, defaultRowHeight));
    onReady();
  }

  try {
    const remote = await api.tablePreferences.get(pageKey, tableKey);
    if (!isActive()) return;

    if (remote.config != null && remote.updated_at != null) {
      const remoteTs = new Date(remote.updated_at).getTime();
      const cacheTs = cached ? new Date(cached.updatedAt).getTime() : 0;
      if (!cached || remoteTs >= cacheTs) {
        const merged = mergePreferenceConfig(defaultColumns, remote.config, defaultRowHeight);
        onConfig(merged);
        await writeCache(merged, remote.updated_at);
      }
    } else if (!cached) {
      onConfig(defaults);
    }

    if (!cached) {
      onReady();
    }
  } catch (err) {
    if (!cached) {
      onConfig(defaults);
      onReady();
    }
    showToastError(errorMessage(err, "表格偏好加载失败"));
  }
}

interface TablePreferenceMutationDeps<T> {
  configRef: RefObject<TablePreferenceConfig>;
  applyConfig: (
    next: TablePreferenceConfig,
    options?: { persist?: boolean; updatedAt?: string; flush?: boolean },
  ) => void;
  defaultColumns: TableColumnDef<T>[];
  defaultRowHeight: number;
  onSortChange?: (sort: TableSortPreference | null) => void;
  userId: number | undefined;
  pageKey: string;
  tableKey: string;
}

export function createTablePreferenceMutations<T>({
  configRef,
  applyConfig,
  defaultColumns,
  defaultRowHeight,
  onSortChange,
  userId,
  pageKey,
  tableKey,
}: TablePreferenceMutationDeps<T>) {
  function updateColumn(columnId: string, patch: Partial<TableColumnPreference>) {
    const colDef = defaultColumns.find((col) => col.id === columnId);
    const nextPatch = { ...patch };
    if (colDef && isActionColumn(colDef)) {
      delete nextPatch.visible;
      delete nextPatch.pinned;
      delete nextPatch.order;
    }
    const next: TablePreferenceConfig = {
      ...configRef.current,
      columns: {
        ...configRef.current.columns,
        [columnId]: {
          ...configRef.current.columns[columnId],
          ...nextPatch,
        },
      },
    };
    applyConfig(next, { flush: true });
  }

  return {
    updateColumn,
    /** PC 表头拖拽调宽：写入偏好并立即同步后端（与自定义字段列宽共用） */
    setColumnWidth: (columnId: string, width: number) => {
      const colDef = defaultColumns.find((col) => col.id === columnId);
      updateColumn(columnId, { width: resolveColumnPixelWidth(width, colDef?.defaultWidth) });
    },
    /** 批量写入列宽（拖拽松手物化按比例铺满后的像素宽） */
    setColumnWidths: (widths: Record<string, number>) => {
      const nextCols = { ...configRef.current.columns };
      for (const [columnId, width] of Object.entries(widths)) {
        const colDef = defaultColumns.find((col) => col.id === columnId);
        if (!nextCols[columnId] && !colDef) continue;
        nextCols[columnId] = {
          ...nextCols[columnId],
          width: resolveColumnPixelWidth(width, colDef?.defaultWidth),
        };
      }
      applyConfig({ ...configRef.current, columns: nextCols }, { flush: true });
    },
    reorderColumns: (orderedIds: string[]) => {
      const normalizedIds = normalizeColumnOrderIds(orderedIds, resolveActionColumnIds(defaultColumns));
      const nextCols = { ...configRef.current.columns };
      normalizedIds.forEach((id, index) => {
        if (!nextCols[id]) return;
        nextCols[id] = { ...nextCols[id], order: index };
      });
      applyConfig({ ...configRef.current, columns: nextCols }, { flush: true });
    },
    setRowHeight: (rowHeight: number) => {
      applyConfig({ ...configRef.current, rowHeight });
    },
    resetColumn: (columnId: string) => {
      const defaults = buildDefaultConfig(defaultColumns, defaultRowHeight);
      const nextCols = { ...configRef.current.columns, [columnId]: defaults.columns[columnId] };
      applyConfig({ ...configRef.current, columns: nextCols }, { flush: true });
    },
    resetAll: async () => {
      const defaults = buildDefaultConfig(defaultColumns, defaultRowHeight);
      if (userId != null) {
        try {
          await api.tablePreferences.reset(pageKey, tableKey);
        } catch {
          /* 404 忽略 */
        }
        await deleteTablePreferenceCache(userId, pageKey, tableKey);
      }
      applyConfig(defaults, { persist: false });
      onSortChange?.(null);
    },
    cycleSort: (columnId: string) => {
      const nextSort = cycleSortState(configRef.current.sort, columnId);
      applyConfig({ ...configRef.current, sort: nextSort }, { flush: true });
      onSortChange?.(nextSort);
    },
  };
}

export { DEFAULT_ROW_HEIGHT };
