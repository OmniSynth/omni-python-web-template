import type {
  AuditLevel,
  OperationLogRecord,
  RequestLogRecord,
  SlowSqlLogRecord,
  SqlSeverity,
  SqlTier,
} from "@/types/audit";
import type { ScheduledJobRunRecord, ScheduledJobRunStatus, ScheduledJobTriggerType } from "@/types/scheduled-job";

export type Tab = "requests" | "operations" | "slow-sql" | "job-runs";

export type AuditTabRow = RequestLogRecord | OperationLogRecord | SlowSqlLogRecord | ScheduledJobRunRecord;

export const AUDIT_PAGE_TITLE = "审计日志";

export const TAB_LABEL: Record<Tab, string> = {
  requests: "请求",
  operations: "操作",
  "slow-sql": "慢 SQL",
  "job-runs": "任务执行",
};

export const LEVEL_LABEL: Record<AuditLevel, string> = {
  system: "系统",
  business: "业务",
};

export const TIER_LABEL: Record<SqlTier, string> = {
  oltp: "OLTP",
  polling: "轮询",
  data: "数据",
  artifact: "归档",
};

export const SEVERITY_LABEL: Record<SqlSeverity, string> = {
  slow: "慢",
  critical: "严重",
};

export const AUDIT_TIER_SELECT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "oltp", label: "OLTP" },
  { value: "polling", label: "轮询" },
  { value: "data", label: "数据" },
  { value: "artifact", label: "归档" },
] as const;

export const AUDIT_LEVEL_SELECT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "business", label: "业务" },
  { value: "system", label: "系统" },
] as const;

export const AUDIT_SEVERITY_SELECT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "slow", label: "慢" },
  { value: "critical", label: "严重" },
] as const;

export const AUDIT_JOB_STATUS_SELECT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "success", label: "成功" },
  { value: "failure", label: "失败" },
  { value: "partial", label: "部分成功" },
  { value: "skipped", label: "已跳过" },
  { value: "running", label: "执行中" },
] as const;

export const AUDIT_JOB_TRIGGER_SELECT_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "cron", label: "定时" },
  { value: "manual", label: "手动" },
] as const;

export type { ScheduledJobRunStatus, ScheduledJobTriggerType };
