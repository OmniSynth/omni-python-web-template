export type ScheduledJobRunStatus = "success" | "failure" | "running" | "partial" | "skipped";

export type ScheduledJobScope = "system" | "tenant";

export type ScheduledJobTriggerType = "cron" | "manual";

export type ScheduledJobRecord = {
  id: number;
  code: string;
  name: string;
  description: string;
  scope: ScheduledJobScope;
  cron_expr: string;
  enabled: boolean;
  active: boolean;
  /** 与 scope=tenant 等价，兼容旧字段 */
  requires_tenant: boolean;
  last_run_at: string | null;
  last_run_status: ScheduledJobRunStatus | null;
  last_run_message: string;
  next_run_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type TenantScheduledJobRecord = {
  code: string;
  name: string;
  description: string;
  scope: ScheduledJobScope;
  cron_expr: string;
  schedule_enabled: boolean;
  last_run_at: string | null;
  last_run_status: ScheduledJobRunStatus | null;
  next_run_at: string | null;
};

export const SCHEDULED_JOB_STATUS_LABELS: Record<string, string> = {
  success: "成功",
  failure: "失败",
  running: "执行中",
  partial: "部分成功",
  skipped: "已跳过",
};

export const SCHEDULED_JOB_TRIGGER_LABELS: Record<ScheduledJobTriggerType, string> = {
  cron: "定时",
  manual: "手动",
};

export type ScheduledJobRunRecord = {
  id: number;
  run_id: string;
  job_code: string;
  scope: ScheduledJobScope;
  tenant_id: number | null;
  trigger_type: ScheduledJobTriggerType;
  actor_user_id: number | null;
  actor_username: string | null;
  trigger_request_id: string | null;
  params_json: Record<string, unknown> | null;
  context_json: Record<string, unknown> | null;
  status: ScheduledJobRunStatus;
  summary: string;
  result_json: Record<string, unknown> | null;
  error_text: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
};

export type PaginatedScheduledJobRuns = {
  items: ScheduledJobRunRecord[];
  total: number;
  page: number;
  page_size: number;
};

export const SCHEDULED_JOB_SCOPE_LABELS: Record<ScheduledJobScope, string> = {
  system: "系统",
  tenant: "租户",
};

export type ScheduledJobTenantOption = {
  id: number;
  code: string;
  name: string;
  phone: string;
  org_name: string;
  org_credit_code: string;
  enabled: boolean;
};

export type ScheduledJobTenantOptionPage = {
  items: ScheduledJobTenantOption[];
  total: number;
  page: number;
  page_size: number;
};
