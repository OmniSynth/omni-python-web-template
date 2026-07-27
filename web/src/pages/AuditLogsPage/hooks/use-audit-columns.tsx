import { useMemo } from "react";
import type { Tab } from "../types";
import {
  buildJobRunColumns,
  buildOperationColumns,
  buildRequestColumns,
  buildSlowSqlColumns,
} from "./audit-column-defs";

export function useAuditColumns(formatDateTime: (value: string) => string, tab: Tab) {
  const requestColumns = useMemo(() => buildRequestColumns(formatDateTime), [formatDateTime]);
  const operationColumns = useMemo(() => buildOperationColumns(formatDateTime), [formatDateTime]);
  const slowSqlColumns = useMemo(() => buildSlowSqlColumns(formatDateTime), [formatDateTime]);
  const jobRunColumns = useMemo(() => buildJobRunColumns(formatDateTime), [formatDateTime]);

  const activeTableMeta = useMemo(() => {
    if (tab === "requests") {
      return { tableKey: "requests" as const, columns: requestColumns, minWidth: 800 };
    }
    if (tab === "operations") {
      return { tableKey: "operations" as const, columns: operationColumns, minWidth: 800 };
    }
    if (tab === "job-runs") {
      return { tableKey: "job-runs" as const, columns: jobRunColumns, minWidth: 960 };
    }
    return { tableKey: "slow-sql" as const, columns: slowSqlColumns, minWidth: 900 };
  }, [tab, requestColumns, operationColumns, slowSqlColumns, jobRunColumns]);

  return { requestColumns, operationColumns, slowSqlColumns, jobRunColumns, activeTableMeta };
}
