import { useTimezone } from "@/contexts/TimezoneContext";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import type { TableColumnDef } from "@/types/table-preference";
import type { AuditTabRow } from "../types";
import { useAuditColumns } from "./use-audit-columns";
import { useAuditLogsPageActions } from "./use-audit-logs-page-actions";
import { useAuditLogsData, useAuditLogsDetailState, useAuditLogsFilters } from "./use-audit-logs-state";

export function useAuditLogsPage() {
  const { formatDateTime, timezone } = useTimezone();
  const filters = useAuditLogsFilters();
  const detail = useAuditLogsDetailState();
  const { activeTableMeta } = useAuditColumns(formatDateTime, filters.tab);

  const tablePrefs = useTablePreferences<AuditTabRow>({
    pageKey: "audit",
    tableKey: activeTableMeta.tableKey,
    defaultColumns: activeTableMeta.columns as TableColumnDef<AuditTabRow>[],
    onSortChange: () => filters.setPage(1),
  });

  const { pageLoadError, loading, activeRows, total } = useAuditLogsData({
    tab: filters.tab,
    page: filters.page,
    pageSize: filters.pageSize,
    dateRange: filters.dateRange,
    timezone,
    keyword: filters.keyword,
    level: filters.level,
    tier: filters.tier,
    severity: filters.severity,
    jobStatus: filters.jobStatus,
    jobTrigger: filters.jobTrigger,
    requestId: filters.requestId,
    tableSort: tablePrefs.sort,
    activeColumns: activeTableMeta.columns as TableColumnDef<AuditTabRow>[],
  });

  const { handleExport, handlePageSizeChange, handleRowClick, applyFilterChange, handleTabChange } =
    useAuditLogsPageActions({
      tab: filters.tab,
      timezone,
      dateRange: filters.dateRange,
      setRequestDetail: detail.setRequestDetail,
      setOperationDetail: detail.setOperationDetail,
      setSlowSqlDetail: detail.setSlowSqlDetail,
      setJobRunDetail: detail.setJobRunDetail,
      setDetailOpen: detail.setDetailOpen,
      setExporting: detail.setExporting,
      setPage: filters.setPage,
      setPageSize: filters.setPageSize,
      tablePrefs,
      setTab: filters.setTab,
    });

  return {
    formatDateTime,
    tab: filters.tab,
    pageLoadError,
    loading,
    dateRange: filters.dateRange,
    keyword: filters.keyword,
    level: filters.level,
    tier: filters.tier,
    severity: filters.severity,
    jobStatus: filters.jobStatus,
    jobTrigger: filters.jobTrigger,
    requestId: filters.requestId,
    page: filters.page,
    pageSize: filters.pageSize,
    total,
    detailOpen: detail.detailOpen,
    setDetailOpen: detail.setDetailOpen,
    requestDetail: detail.requestDetail,
    operationDetail: detail.operationDetail,
    slowSqlDetail: detail.slowSqlDetail,
    jobRunDetail: detail.jobRunDetail,
    exporting: detail.exporting,
    activeTableMeta,
    tablePrefs,
    activeRows,
    hiddenFilterActiveCount: filters.hiddenFilterActiveCount,
    handleTabChange,
    handleExport,
    handlePageSizeChange,
    handleRowClick,
    setPage: filters.setPage,
    applyFilterChange,
    setDateRange: filters.setDateRange,
    setKeyword: filters.setKeyword,
    setLevel: filters.setLevel,
    setTier: filters.setTier,
    setSeverity: filters.setSeverity,
    setJobStatus: filters.setJobStatus,
    setJobTrigger: filters.setJobTrigger,
    setRequestId: filters.setRequestId,
  };
}
