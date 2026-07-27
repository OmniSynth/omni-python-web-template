import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRangeValue } from "@/components/form/date-range-filter-field";
import { useGlobalPageSize } from "@/hooks/use-global-page-size";
import { api } from "@/lib/api";
import { dateOnlyToApiUtc } from "@/lib/datetime";
import { sortKeyFromPreference } from "@/lib/list-sort";
import type { PageSizeOption } from "@/lib/pagination";
import type {
  AuditLevel,
  OperationLogRecord,
  RequestLogRecord,
  SlowSqlLogRecord,
  SqlSeverity,
  SqlTier,
} from "@/types/audit";
import type { ScheduledJobRunRecord, ScheduledJobRunStatus, ScheduledJobTriggerType } from "@/types/scheduled-job";
import type { TableColumnDef, TableSortPreference } from "@/types/table-preference";
import type { AuditTabRow, Tab } from "../types";

export function useAuditLogsFilters() {
  const [tab, setTab] = useState<Tab>("requests");
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState<AuditLevel | "">("");
  const [tier, setTier] = useState<SqlTier | "">("");
  const [severity, setSeverity] = useState<SqlSeverity | "">("");
  const [jobStatus, setJobStatus] = useState<ScheduledJobRunStatus | "">("");
  const [jobTrigger, setJobTrigger] = useState<ScheduledJobTriggerType | "">("");
  const [requestId, setRequestId] = useState("");
  const [page, setPage] = useState(1);
  const { pageSize, setPageSize } = useGlobalPageSize();

  const hiddenFilterActiveCount = useMemo(() => {
    let count = 0;
    if (dateRange.from.trim() || dateRange.to.trim()) count += 1;
    if (keyword.trim()) count += 1;
    if (tab === "slow-sql") {
      if (tier) count += 1;
      if (severity) count += 1;
    } else if (tab === "job-runs") {
      if (jobStatus) count += 1;
      if (jobTrigger) count += 1;
    } else if (level) {
      count += 1;
    }
    if (requestId.trim()) count += 1;
    return count;
  }, [dateRange.from, dateRange.to, jobStatus, jobTrigger, keyword, level, requestId, severity, tab, tier]);

  return {
    tab,
    setTab,
    dateRange,
    setDateRange,
    keyword,
    setKeyword,
    level,
    setLevel,
    tier,
    setTier,
    severity,
    setSeverity,
    jobStatus,
    setJobStatus,
    jobTrigger,
    setJobTrigger,
    requestId,
    setRequestId,
    page,
    setPage,
    pageSize,
    setPageSize,
    hiddenFilterActiveCount,
  };
}

export function useAuditLogsDetailState() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestDetail, setRequestDetail] = useState<RequestLogRecord | null>(null);
  const [operationDetail, setOperationDetail] = useState<OperationLogRecord | null>(null);
  const [slowSqlDetail, setSlowSqlDetail] = useState<SlowSqlLogRecord | null>(null);
  const [jobRunDetail, setJobRunDetail] = useState<ScheduledJobRunRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  return {
    detailOpen,
    setDetailOpen,
    requestDetail,
    setRequestDetail,
    operationDetail,
    setOperationDetail,
    slowSqlDetail,
    setSlowSqlDetail,
    jobRunDetail,
    setJobRunDetail,
    exporting,
    setExporting,
  };
}

function activeRowsForTab(
  tab: Tab,
  requests: RequestLogRecord[],
  operations: OperationLogRecord[],
  slowSqlLogs: SlowSqlLogRecord[],
  jobRuns: ScheduledJobRunRecord[],
): AuditTabRow[] {
  if (tab === "requests") return requests;
  if (tab === "operations") return operations;
  if (tab === "job-runs") return jobRuns;
  return slowSqlLogs;
}

export function useAuditLogsData({
  tab,
  page,
  pageSize,
  dateRange,
  timezone,
  keyword,
  level,
  tier,
  severity,
  jobStatus,
  jobTrigger,
  requestId,
  tableSort,
  activeColumns,
}: {
  tab: Tab;
  page: number;
  pageSize: PageSizeOption;
  dateRange: DateRangeValue;
  timezone: string;
  keyword: string;
  level: AuditLevel | "";
  tier: SqlTier | "";
  severity: SqlSeverity | "";
  jobStatus: ScheduledJobRunStatus | "";
  jobTrigger: ScheduledJobTriggerType | "";
  requestId: string;
  tableSort: TableSortPreference | null;
  activeColumns: TableColumnDef<AuditTabRow>[];
}) {
  const [pageLoadError, setPageLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<RequestLogRecord[]>([]);
  const [operations, setOperations] = useState<OperationLogRecord[]>([]);
  const [slowSqlLogs, setSlowSqlLogs] = useState<SlowSqlLogRecord[]>([]);
  const [jobRuns, setJobRuns] = useState<ScheduledJobRunRecord[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateOnlyToApiUtc(dateRange.from, timezone, "start");
      const to = dateOnlyToApiUtc(dateRange.to, timezone, "end");
      const sortParams = sortKeyFromPreference(tableSort, activeColumns);
      if (tab === "job-runs") {
        const res = await api.audit.listScheduledJobRuns({
          page,
          page_size: pageSize,
          from,
          to,
          keyword: keyword || undefined,
          status: jobStatus || undefined,
          trigger_type: jobTrigger || undefined,
          request_id: requestId || undefined,
        });
        setJobRuns(res.items);
        setTotal(res.total);
        return;
      }
      const baseParams: Record<string, string | number | undefined> = {
        page,
        page_size: pageSize,
        from,
        to,
        keyword: keyword || undefined,
        level: level || undefined,
        request_id: requestId || undefined,
      };
      if (tab === "requests") {
        const res = await api.audit.listRequests({ ...baseParams, ...sortParams });
        setRequests(res.items);
        setTotal(res.total);
      } else if (tab === "operations") {
        const res = await api.audit.listOperations({ ...baseParams, ...sortParams });
        setOperations(res.items);
        setTotal(res.total);
      } else {
        const res = await api.audit.listSlowSql({
          ...baseParams,
          ...sortParams,
          tier: tier || undefined,
          severity: severity || undefined,
        });
        setSlowSqlLogs(res.items);
        setTotal(res.total);
      }
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    page,
    pageSize,
    dateRange.from,
    dateRange.to,
    timezone,
    keyword,
    level,
    tier,
    severity,
    jobStatus,
    jobTrigger,
    requestId,
    tableSort,
    activeColumns,
  ]);

  useEffect(() => {
    load()
      .then(() => setPageLoadError(""))
      .catch((e: Error) => setPageLoadError(e.message));
  }, [load]);

  const activeRows = activeRowsForTab(tab, requests, operations, slowSqlLogs, jobRuns);

  return { pageLoadError, loading, activeRows, total };
}
