import type { OperationLogRecord, RequestLogRecord, SlowSqlLogRecord } from "@/types/audit";
import type { ScheduledJobRunRecord } from "@/types/scheduled-job";
import { SCHEDULED_JOB_STATUS_LABELS, SCHEDULED_JOB_TRIGGER_LABELS } from "@/types/scheduled-job";
import type { TableColumnDef } from "@/types/table-preference";
import { LEVEL_LABEL, SEVERITY_LABEL, TIER_LABEL } from "../types";

export function buildRequestColumns(formatDateTime: (value: string) => string): TableColumnDef<RequestLogRecord>[] {
  return [
    {
      id: "occurred_at",
      label: "时间",
      defaultWidth: 180,
      sortKey: "occurred_at",
      render: (r) => formatDateTime(r.occurred_at),
    },
    {
      id: "level",
      label: "级别",
      defaultWidth: 80,
      sortKey: "level",
      render: (r) => LEVEL_LABEL[r.level],
    },
    { id: "method", label: "方法", defaultWidth: 80, sortKey: "method", render: (r) => r.method },
    {
      id: "path",
      label: "路径",
      defaultWidth: 200,
      sortKey: "path",
      className: "max-w-[200px] truncate font-mono text-xs",
      render: (r) => r.path,
    },
    {
      id: "status_code",
      label: "状态",
      defaultWidth: 80,
      sortKey: "status_code",
      render: (r) => r.status_code,
    },
    {
      id: "username",
      label: "用户",
      defaultWidth: 120,
      sortKey: "username",
      render: (r) => r.username ?? "—",
    },
    {
      id: "duration_ms",
      label: "耗时",
      defaultWidth: 80,
      sortKey: "duration_ms",
      render: (r) => `${r.duration_ms}ms`,
    },
  ];
}

export function buildOperationColumns(formatDateTime: (value: string) => string): TableColumnDef<OperationLogRecord>[] {
  return [
    {
      id: "occurred_at",
      label: "时间",
      defaultWidth: 180,
      sortKey: "occurred_at",
      render: (o) => formatDateTime(o.occurred_at),
    },
    {
      id: "level",
      label: "级别",
      defaultWidth: 80,
      sortKey: "level",
      render: (o) => LEVEL_LABEL[o.level],
    },
    { id: "category", label: "分类", defaultWidth: 100, sortKey: "category", render: (o) => o.category },
    { id: "action", label: "操作", defaultWidth: 120, sortKey: "action", render: (o) => o.action },
    {
      id: "summary",
      label: "摘要",
      defaultWidth: 240,
      className: "max-w-[240px] truncate",
      render: (o) => o.summary,
    },
    {
      id: "actor_username",
      label: "操作人",
      defaultWidth: 120,
      sortKey: "actor_username",
      render: (o) => o.actor_username ?? "—",
    },
    { id: "result", label: "结果", defaultWidth: 80, sortKey: "result", render: (o) => o.result },
  ];
}

export function buildSlowSqlColumns(formatDateTime: (value: string) => string): TableColumnDef<SlowSqlLogRecord>[] {
  return [
    {
      id: "occurred_at",
      label: "时间",
      defaultWidth: 180,
      sortKey: "occurred_at",
      render: (r) => formatDateTime(r.occurred_at),
    },
    {
      id: "tier",
      label: "Tier",
      defaultWidth: 80,
      sortKey: "tier",
      render: (r) => TIER_LABEL[r.tier],
    },
    {
      id: "severity",
      label: "级别",
      defaultWidth: 80,
      sortKey: "severity",
      render: (r) => SEVERITY_LABEL[r.severity],
    },
    {
      id: "duration_ms",
      label: "总耗时",
      defaultWidth: 88,
      sortKey: "duration_ms",
      render: (r) => `${r.duration_ms}ms`,
    },
    {
      id: "threshold_ms",
      label: "阈值",
      defaultWidth: 80,
      render: (r) => `${r.threshold_ms}ms`,
    },
    {
      id: "http_path",
      label: "HTTP 路径",
      defaultWidth: 200,
      className: "max-w-[200px] truncate font-mono text-xs",
      render: (r) => r.http_path ?? "—",
    },
  ];
}

export function buildJobRunColumns(formatDateTime: (value: string) => string): TableColumnDef<ScheduledJobRunRecord>[] {
  return [
    {
      id: "started_at",
      label: "开始时间",
      defaultWidth: 180,
      render: (r) => formatDateTime(r.started_at),
    },
    {
      id: "job_code",
      label: "任务编码",
      defaultWidth: 160,
      className: "font-mono text-xs",
      render: (r) => r.job_code,
    },
    {
      id: "status",
      label: "状态",
      defaultWidth: 100,
      render: (r) => SCHEDULED_JOB_STATUS_LABELS[r.status] ?? r.status,
    },
    {
      id: "trigger_type",
      label: "触发",
      defaultWidth: 80,
      render: (r) => SCHEDULED_JOB_TRIGGER_LABELS[r.trigger_type] ?? r.trigger_type,
    },
    {
      id: "tenant_id",
      label: "租户",
      defaultWidth: 80,
      render: (r) => (r.tenant_id != null ? `#${r.tenant_id}` : "—"),
    },
    {
      id: "summary",
      label: "摘要",
      defaultWidth: 260,
      className: "max-w-[260px] truncate",
      render: (r) => r.summary || "—",
    },
    {
      id: "duration_ms",
      label: "耗时",
      defaultWidth: 88,
      render: (r) => (r.duration_ms != null ? `${r.duration_ms}ms` : "—"),
    },
    {
      id: "actor_username",
      label: "操作人",
      defaultWidth: 120,
      render: (r) => r.actor_username ?? "—",
    },
  ];
}
