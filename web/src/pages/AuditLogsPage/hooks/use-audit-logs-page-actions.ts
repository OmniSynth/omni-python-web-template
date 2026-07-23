import type { Dispatch, SetStateAction } from "react";
import type { DateRangeValue } from "@/components/form/date-range-filter-field";
import { api } from "@/lib/api";
import { buildPresetDateRange, dateOnlyToApiUtc } from "@/lib/datetime";
import { errorMessage, showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { PageSizeOption } from "@/lib/pagination";
import type { OperationLogRecord, RequestLogRecord, SlowSqlLogRecord } from "@/types/audit";
import type { AuditTabRow, Tab } from "../types";

export function useAuditLogsPageActions({
  tab,
  timezone,
  dateRange,
  setRequestDetail,
  setOperationDetail,
  setSlowSqlDetail,
  setDetailOpen,
  setExporting,
  setPage,
  setPageSize,
  tablePrefs,
  setTab,
}: {
  tab: Tab;
  timezone: string;
  dateRange: DateRangeValue;
  setRequestDetail: Dispatch<SetStateAction<RequestLogRecord | null>>;
  setOperationDetail: Dispatch<SetStateAction<OperationLogRecord | null>>;
  setSlowSqlDetail: Dispatch<SetStateAction<SlowSqlLogRecord | null>>;
  setDetailOpen: Dispatch<SetStateAction<boolean>>;
  setExporting: Dispatch<SetStateAction<boolean>>;
  setPage: Dispatch<SetStateAction<number>>;
  setPageSize: (next: number) => void;
  tablePrefs: { setSettingsOpen: (open: boolean) => void };
  setTab: Dispatch<SetStateAction<Tab>>;
}) {
  async function openRequestDetail(id: number) {
    const rec = await api.audit.getRequest(id);
    setRequestDetail(rec);
    setOperationDetail(null);
    setSlowSqlDetail(null);
    setDetailOpen(true);
  }

  async function openOperationDetail(id: number) {
    const rec = await api.audit.getOperation(id);
    setOperationDetail(rec);
    setRequestDetail(null);
    setSlowSqlDetail(null);
    setDetailOpen(true);
  }

  async function openSlowSqlDetail(id: number) {
    const rec = await api.audit.getSlowSql(id);
    setSlowSqlDetail(rec);
    setRequestDetail(null);
    setOperationDetail(null);
    setDetailOpen(true);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const preset = dateRange.from.trim() && dateRange.to.trim() ? dateRange : buildPresetDateRange(90, timezone);
      const from = dateOnlyToApiUtc(preset.from, timezone, "start");
      const to = dateOnlyToApiUtc(preset.to, timezone, "end");
      if (!from || !to) {
        showToastError("时间范围无效");
        return;
      }
      const result = await api.audit.export({ from, to, types: "all", purge: false });
      showToastSuccess(
        `已导出：请求 ${result.request_count} 条，操作 ${result.operation_count} 条，慢 SQL ${result.slow_sql_count} 条`,
      );
    } catch (e) {
      showToastError(errorMessage(e, "导出失败"));
    } finally {
      setExporting(false);
    }
  }

  function handlePageSizeChange(next: number) {
    setPageSize(next as PageSizeOption);
    setPage(1);
  }

  function handleRowClick(row: AuditTabRow) {
    if (tab === "requests") {
      void openRequestDetail((row as RequestLogRecord).id);
    } else if (tab === "operations") {
      void openOperationDetail((row as OperationLogRecord).id);
    } else {
      void openSlowSqlDetail((row as SlowSqlLogRecord).id);
    }
  }

  function applyFilterChange<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function handleTabChange(nextTab: Tab) {
    tablePrefs.setSettingsOpen(false);
    setTab(nextTab);
    setPage(1);
  }

  return {
    handleExport,
    handlePageSizeChange,
    handleRowClick,
    applyFilterChange,
    handleTabChange,
  };
}
