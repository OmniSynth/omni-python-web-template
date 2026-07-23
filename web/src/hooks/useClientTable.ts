import { useMemo } from "react";
import { useClientPagination } from "@/hooks/useClientPagination";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import type { TableColumnDef } from "@/types/table-preference";
import { sortRows } from "@/types/table-preference";

interface UseClientTableOptions<T> {
  pageKey: string;
  tableKey: string;
  rows: T[];
  defaultColumns: TableColumnDef<T>[];
  defaultRowHeight?: number;
}

/** 客户端分页表格：偏好 + 排序 + 分页。 */
export function useClientTable<T>({
  pageKey,
  tableKey,
  rows,
  defaultColumns,
  defaultRowHeight,
}: UseClientTableOptions<T>) {
  const prefs = useTablePreferences({
    pageKey,
    tableKey,
    defaultColumns,
    defaultRowHeight,
  });

  const sortedRows = useMemo(() => sortRows(rows, prefs.sort, defaultColumns), [rows, prefs.sort, defaultColumns]);

  const pagination = useClientPagination(sortedRows);

  return {
    ...prefs,
    pagination,
    sortedRows,
  };
}
