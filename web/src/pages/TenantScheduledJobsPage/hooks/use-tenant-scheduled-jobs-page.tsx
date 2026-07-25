import { useCallback, useEffect, useMemo, useState } from "react";
import { createActionsColumn } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useClientTable } from "@/hooks/useClientTable";
import { api } from "@/lib/api";
import { TRIGGER_ACCEPTED_MSG } from "@/lib/api/scheduled-jobs";
import { showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { TenantScheduledJobRecord } from "@/types/scheduled-job";
import { SCHEDULED_JOB_STATUS_LABELS } from "@/types/scheduled-job";
import type { TableColumnDef } from "@/types/table-preference";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  success: "success",
  failure: "destructive",
  running: "default",
};

export function useTenantScheduledJobsPage() {
  const { formatDateTime } = useTimezone();
  const [jobs, setJobs] = useState<TenantScheduledJobRecord[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");
  const [actionCode, setActionCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPageLoadError("");
      setJobs(await api.scheduledJobs.listTenantJobs());
    } catch (error) {
      setPageLoadError(error instanceof Error ? error.message : "加载失败");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTrigger = useCallback(
    async (job: TenantScheduledJobRecord) => {
      setActionCode(job.code);
      try {
        const result = await api.scheduledJobs.triggerTenantJob(job.code);
        showToastSuccess(result.message || TRIGGER_ACCEPTED_MSG);
        await load();
      } catch (error) {
        showToastError(error instanceof Error ? error.message : "执行失败");
      } finally {
        setActionCode(null);
      }
    },
    [load],
  );

  const columns = useMemo<TableColumnDef<TenantScheduledJobRecord>[]>(
    () => [
      { id: "name", label: "任务名称", defaultWidth: 180, render: (job) => job.name },
      { id: "code", label: "任务编码", defaultWidth: 160, render: (job) => job.code },
      {
        id: "description",
        label: "说明",
        defaultWidth: 260,
        render: (job) => job.description || "—",
      },
      {
        id: "schedule_enabled",
        label: "调度状态",
        defaultWidth: 100,
        render: (job) => (
          <Badge variant={job.schedule_enabled ? "success" : "secondary"}>
            {job.schedule_enabled ? "可调度" : "已停止"}
          </Badge>
        ),
      },
      {
        id: "last_run_at",
        label: "上次执行",
        defaultWidth: 170,
        render: (job) => (job.last_run_at ? formatDateTime(job.last_run_at) : "—"),
      },
      {
        id: "last_run_status",
        label: "执行结果",
        defaultWidth: 100,
        render: (job) =>
          job.last_run_status ? (
            <Badge variant={STATUS_VARIANT[job.last_run_status] ?? "secondary"}>
              {SCHEDULED_JOB_STATUS_LABELS[job.last_run_status] ?? job.last_run_status}
            </Badge>
          ) : (
            "—"
          ),
      },
      createActionsColumn({
        defaultWidth: 100,
        actionDefs: [{ id: "trigger", label: "执行" }],
        renderItems: (job) => [
          {
            id: "trigger",
            label: "执行",
            permission: "tenant.scheduled_job.trigger",
            disabled: actionCode === job.code,
            onClick: () => void handleTrigger(job),
          },
        ],
      }),
    ],
    [actionCode, formatDateTime, handleTrigger],
  );

  const table = useClientTable({
    pageKey: "tenant_scheduled_jobs",
    tableKey: "main",
    rows: jobs,
    defaultColumns: columns,
  });

  return { pageLoadError, columns, table };
}
