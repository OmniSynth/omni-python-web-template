import { useCallback, useEffect, useState } from "react";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useClientTable } from "@/hooks/useClientTable";
import { api } from "@/lib/api";
import { showToastSuccess } from "@/lib/form-feedback";
import type { ScheduledJobRecord } from "@/types/scheduled-job";
import { useScheduledJobColumns } from "./use-scheduled-job-columns";
import { useScheduledJobsPageActions } from "./use-scheduled-jobs-page-actions";

type TenantSheetMode = "trigger" | "stop";

export function useScheduledJobsPage() {
  const { formatDateTime } = useTimezone();
  const [jobs, setJobs] = useState<ScheduledJobRecord[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledJobRecord | null>(null);
  const [cronExpr, setCronExpr] = useState("*/5 * * * *");
  const [cronEditorKey, setCronEditorKey] = useState(0);
  const [sectionError, setSectionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [tenantSheetOpen, setTenantSheetOpen] = useState(false);
  const [targeting, setTargeting] = useState<ScheduledJobRecord | null>(null);
  const [tenantSheetMode, setTenantSheetMode] = useState<TenantSheetMode>("trigger");
  const [tenantSheetError, setTenantSheetError] = useState("");
  const [tenantSheetSubmitting, setTenantSheetSubmitting] = useState(false);
  const [historyJob, setHistoryJob] = useState<ScheduledJobRecord | null>(null);

  const load = useCallback(async () => {
    try {
      setPageLoadError("");
      const rows = await api.scheduledJobs.list();
      setJobs(rows);
    } catch (error) {
      setPageLoadError(error instanceof Error ? error.message : "加载失败");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = useCallback((job: ScheduledJobRecord) => {
    setEditing(job);
    setCronExpr(job.cron_expr);
    setCronEditorKey((key) => key + 1);
    setSectionError("");
    setSheetOpen(true);
  }, []);

  const actions = useScheduledJobsPageActions({
    load,
    editing,
    cronExpr,
    targeting,
    tenantSheetMode,
    setActionCode,
    setSectionError,
    setSaving,
    setSheetOpen,
    setEditing,
    setTenantSheetOpen,
    setTargeting,
    setTenantSheetMode,
    setTenantSheetError,
    setTenantSheetSubmitting,
  });

  const handleConfirmGlobalStop = useCallback(async () => {
    if (!targeting) return;
    setTenantSheetSubmitting(true);
    setTenantSheetError("");
    setActionCode(targeting.code);
    try {
      await api.scheduledJobs.stop(targeting.code);
      showToastSuccess(`已停止「${targeting.name}」全局调度`);
      setTenantSheetOpen(false);
      setTargeting(null);
      await load();
    } catch (error) {
      setTenantSheetError(error instanceof Error ? error.message : "停止失败");
    } finally {
      setTenantSheetSubmitting(false);
      setActionCode(null);
    }
  }, [load, targeting]);

  const columns = useScheduledJobColumns({
    formatDateTime,
    onEdit: openEdit,
    onTrigger: actions.openExecute,
    onStart: actions.handleStart,
    onStop: actions.openStop,
    onHistory: setHistoryJob,
    actionCode,
  });

  const table = useClientTable({
    pageKey: "scheduled_jobs",
    tableKey: "main",
    rows: jobs,
    defaultColumns: columns,
  });

  return {
    pageLoadError,
    table,
    columns,
    sheetOpen,
    setSheetOpen,
    editing,
    setEditing,
    cronExpr,
    setCronExpr,
    cronEditorKey,
    sectionError,
    saving,
    handleSave: actions.handleSave,
    tenantSheetOpen,
    setTenantSheetOpen,
    targeting,
    setTargeting,
    tenantSheetMode,
    tenantSheetError,
    tenantSheetSubmitting,
    handleConfirmTenantSheet: actions.handleConfirmTenantSheet,
    handleConfirmGlobalStop,
    historyJob,
    historyOpen: historyJob != null,
    setHistoryOpen: (open: boolean) => {
      if (!open) setHistoryJob(null);
    },
    load,
  };
}
