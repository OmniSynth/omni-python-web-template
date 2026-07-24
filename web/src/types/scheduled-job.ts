export type ScheduledJobRunStatus = "success" | "failure" | "running";

export type ScheduledJobRecord = {
  id: number;
  code: string;
  name: string;
  description: string;
  cron_expr: string;
  enabled: boolean;
  active: boolean;
  /** 手动触发是否必须选择租户；平台级任务为 false */
  requires_tenant: boolean;
  last_run_at: string | null;
  last_run_status: ScheduledJobRunStatus | null;
  last_run_message: string;
  next_run_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const SCHEDULED_JOB_STATUS_LABELS: Record<string, string> = {
  success: "成功",
  failure: "失败",
  running: "执行中",
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
