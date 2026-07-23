import { useMemo } from "react";
import type { Tab } from "../types";
import { buildOperationColumns, buildRequestColumns, buildSlowSqlColumns } from "./audit-column-defs";

export function useAuditColumns(formatDateTime: (value: string) => string, tab: Tab) {
  const requestColumns = useMemo(() => buildRequestColumns(formatDateTime), [formatDateTime]);
  const operationColumns = useMemo(() => buildOperationColumns(formatDateTime), [formatDateTime]);
  const slowSqlColumns = useMemo(() => buildSlowSqlColumns(formatDateTime), [formatDateTime]);

  const activeTableMeta = useMemo(() => {
    if (tab === "requests") {
      return { tableKey: "requests" as const, columns: requestColumns, minWidth: 800 };
    }
    if (tab === "operations") {
      return { tableKey: "operations" as const, columns: operationColumns, minWidth: 800 };
    }
    return { tableKey: "slow-sql" as const, columns: slowSqlColumns, minWidth: 900 };
  }, [tab, requestColumns, operationColumns, slowSqlColumns]);

  return { requestColumns, operationColumns, slowSqlColumns, activeTableMeta };
}
