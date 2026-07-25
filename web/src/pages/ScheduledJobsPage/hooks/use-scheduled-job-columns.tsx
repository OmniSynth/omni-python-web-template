import { useMemo } from "react";
import { createActionsColumn } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import { describeCronExpr } from "@/lib/cron-builder";
import type { ScheduledJobRecord } from "@/types/scheduled-job";
import { SCHEDULED_JOB_SCOPE_LABELS, SCHEDULED_JOB_STATUS_LABELS } from "@/types/scheduled-job";
import type { TableColumnDef } from "@/types/table-preference";

function formatDateTimeOrDash(formatDateTime: (value: string) => string, value: string | null) {
  return value ? formatDateTime(value) : "—";
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  success: "success",
  failure: "destructive",
  running: "default",
};

export function useScheduledJobColumns({
  formatDateTime,
  onEdit,
  onTrigger,
  onStart,
  onStop,
  actionCode,
}: {
  formatDateTime: (value: string) => string;
  onEdit: (job: ScheduledJobRecord) => void;
  onTrigger: (job: ScheduledJobRecord) => void;
  onStart: (job: ScheduledJobRecord) => void;
  onStop: (job: ScheduledJobRecord) => void;
  actionCode: string | null;
}) {
  return useMemo<TableColumnDef<ScheduledJobRecord>[]>(
    () => [
      { id: "name", label: "任务名称", defaultWidth: 160, sortKey: "name", render: (job) => job.name },
      { id: "code", label: "任务编码", defaultWidth: 140, sortKey: "code", render: (job) => job.code },
      {
        id: "scope",
        label: "范围",
        defaultWidth: 80,
        sortKey: "scope",
        render: (job) => (
          <Badge variant={job.scope === "system" ? "secondary" : "default"}>
            {SCHEDULED_JOB_SCOPE_LABELS[job.scope] ?? job.scope}
          </Badge>
        ),
      },
      {
        id: "description",
        label: "说明",
        defaultWidth: 220,
        render: (job) => job.description || "—",
      },
      {
        id: "cron_expr",
        label: "执行计划",
        defaultWidth: 220,
        render: (job) => (
          <div>
            <div className="font-mono text-xs">{job.cron_expr}</div>
            <div className="text-xs text-muted-foreground">{describeCronExpr(job.cron_expr)}</div>
          </div>
        ),
      },
      {
        id: "enabled",
        label: "已启用",
        defaultWidth: 80,
        sortKey: "enabled",
        render: (job) => (job.enabled ? "是" : "否"),
      },
      {
        id: "active",
        label: "任务状态",
        defaultWidth: 90,
        render: (job) => (
          <Badge variant={job.active ? "success" : "secondary"}>{job.active ? "运行中" : "已停止"}</Badge>
        ),
      },
      {
        id: "last_run_at",
        label: "上次执行",
        defaultWidth: 170,
        sortKey: "last_run_at",
        render: (job) => formatDateTimeOrDash(formatDateTime, job.last_run_at),
      },
      {
        id: "next_run_at",
        label: "下次执行",
        defaultWidth: 170,
        sortKey: "next_run_at",
        render: (job) => formatDateTimeOrDash(formatDateTime, job.next_run_at),
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
        defaultWidth: 160,
        actionDefs: [
          { id: "edit", label: "编辑" },
          { id: "trigger", label: "执行" },
          { id: "start", label: "启动" },
          { id: "stop", label: "停止" },
        ],
        renderItems: (job) => [
          { id: "edit", label: "编辑", permission: "system.scheduled_job.update", onClick: () => onEdit(job) },
          {
            id: "trigger",
            label: "执行",
            permission: "system.scheduled_job.trigger",
            disabled: actionCode === job.code,
            onClick: () => void onTrigger(job),
          },
          {
            id: "start",
            label: "启动",
            permission: "system.scheduled_job.control",
            hidden: job.enabled,
            disabled: actionCode === job.code,
            onClick: () => void onStart(job),
          },
          {
            id: "stop",
            label: "停止",
            permission: "system.scheduled_job.control",
            hidden: !job.enabled,
            disabled: actionCode === job.code,
            onClick: () => void onStop(job),
          },
        ],
      }),
    ],
    [actionCode, formatDateTime, onEdit, onStart, onStop, onTrigger],
  );
}
