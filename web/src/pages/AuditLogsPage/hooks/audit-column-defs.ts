import type { OperationLogRecord, RequestLogRecord, SlowSqlLogRecord } from "@/types/audit";
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
