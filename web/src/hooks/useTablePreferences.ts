import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  columnsSignature,
  createTablePreferenceMutations,
  DEFAULT_ROW_HEIGHT,
  flushTablePreferenceSave,
  loadTablePreferences,
  scheduleTablePreferenceSave,
  writeTablePreferenceCacheEntry,
} from "@/hooks/table-preferences-helpers";
import type { TableColumnDef, TablePreferenceConfig, TableSortPreference } from "@/types/table-preference";
import {
  buildDefaultConfig,
  mergePreferenceConfig,
  resolveColumns,
  serializeTablePreferenceConfig,
} from "@/types/table-preference";

interface UseTablePreferencesOptions<T> {
  pageKey: string;
  tableKey: string;
  defaultColumns: TableColumnDef<T>[];
  defaultRowHeight?: number;
  onSortChange?: (sort: TableSortPreference | null) => void;
}

function useTablePreferenceSync<T>(
  pageKey: string,
  tableKey: string,
  userId: number | undefined,
  defaultColumns: TableColumnDef<T>[],
  defaultRowHeight: number,
) {
  const [config, setConfig] = useState<TablePreferenceConfig>(() =>
    buildDefaultConfig(defaultColumns, defaultRowHeight),
  );
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const defaultColumnsRef = useRef(defaultColumns);
  defaultColumnsRef.current = defaultColumns;
  const defaultRowHeightRef = useRef(defaultRowHeight);
  defaultRowHeightRef.current = defaultRowHeight;
  const columnsSigRef = useRef(columnsSignature(defaultColumns));

  const writeCache = useCallback(
    async (next: TablePreferenceConfig, updatedAt: string) => {
      if (userId == null) return;
      await writeTablePreferenceCacheEntry(userId, pageKey, tableKey, next, updatedAt);
    },
    [pageKey, tableKey, userId],
  );

  const applyConfig = useCallback(
    (next: TablePreferenceConfig, options?: { persist?: boolean; updatedAt?: string; flush?: boolean }) => {
      const normalized = serializeTablePreferenceConfig(next);
      configRef.current = normalized;
      setConfig(normalized);
      if (options?.persist === false || userId == null) return;

      void (async () => {
        const ts = options?.updatedAt ?? new Date().toISOString();
        await writeCache(normalized, ts);
        if (options?.flush) {
          await flushTablePreferenceSave(saveTimer, pageKey, tableKey, normalized, writeCache);
        } else {
          scheduleTablePreferenceSave(saveTimer, pageKey, tableKey, normalized, writeCache);
        }
      })();
    },
    [pageKey, tableKey, userId, writeCache],
  );

  useEffect(() => {
    const sig = columnsSignature(defaultColumns);
    if (sig === columnsSigRef.current) return;
    columnsSigRef.current = sig;
    setConfig((prev) => mergePreferenceConfig(defaultColumns, prev, defaultRowHeight));
  }, [defaultColumns, defaultRowHeight]);

  useEffect(() => {
    if (userId == null) {
      setReady(true);
      return;
    }
    let active = true;
    setReady(false);
    void loadTablePreferences({
      userId,
      pageKey,
      tableKey,
      defaultColumns: defaultColumnsRef.current,
      defaultRowHeight: defaultRowHeightRef.current,
      writeCache,
      isActive: () => active,
      onConfig: (next) => setConfig(next),
      onReady: () => {
        if (active) setReady(true);
      },
    });
    return () => {
      active = false;
    };
  }, [pageKey, tableKey, userId, writeCache]);

  return { config, configRef, ready, applyConfig };
}

export function useTablePreferences<T>({
  pageKey,
  tableKey,
  defaultColumns,
  defaultRowHeight = DEFAULT_ROW_HEIGHT,
  onSortChange,
}: UseTablePreferencesOptions<T>) {
  const { user } = useAuth();
  const userId = user?.id;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { config, configRef, ready, applyConfig } = useTablePreferenceSync(
    pageKey,
    tableKey,
    userId,
    defaultColumns,
    defaultRowHeight,
  );

  const resolvedColumns = useMemo(() => resolveColumns(defaultColumns, config), [config, defaultColumns]);

  const mutations = useMemo(
    () =>
      createTablePreferenceMutations({
        configRef,
        applyConfig,
        defaultColumns,
        defaultRowHeight,
        onSortChange,
        userId,
        pageKey,
        tableKey,
      }),
    [applyConfig, configRef, defaultColumns, defaultRowHeight, onSortChange, pageKey, tableKey, userId],
  );

  return {
    config,
    ready,
    resolvedColumns,
    rowHeight: config.rowHeight,
    sort: config.sort ?? null,
    settingsOpen,
    setSettingsOpen,
    ...mutations,
    defaultColumns,
  };
}
