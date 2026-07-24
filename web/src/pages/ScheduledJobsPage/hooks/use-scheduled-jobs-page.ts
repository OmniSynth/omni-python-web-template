import { useCallback, useEffect, useState } from "react";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useClientTable } from "@/hooks/useClientTable";
import { api } from "@/lib/api";
import type { ScheduledJobRecord } from "@/types/scheduled-job";
import { useScheduledJobColumns } from "./use-scheduled-job-columns";
import { useScheduledJobsPageActions } from "./use-scheduled-jobs-page-actions";

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
  const [executeOpen, setExecuteOpen] = useState(false);
  const [triggering, setTriggering] = useState<ScheduledJobRecord | null>(null);
  const [executeError, setExecuteError] = useState("");
  const [executeSubmitting, setExecuteSubmitting] = useState(false);

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
    triggering,
    setActionCode,
    setSectionError,
    setSaving,
    setSheetOpen,
    setEditing,
    setExecuteOpen,
    setTriggering,
    setExecuteError,
    setExecuteSubmitting,
  });

  const columns = useScheduledJobColumns({
    formatDateTime,
    onEdit: openEdit,
    onTrigger: actions.openExecute,
    onStart: actions.handleStart,
    onStop: actions.handleStop,
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
    executeOpen,
    setExecuteOpen,
    triggering,
    setTriggering,
    executeError,
    executeSubmitting,
    handleConfirmExecute: actions.handleConfirmExecute,
    load,
  };
}
