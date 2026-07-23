export type ScheduledJobRunStatus = "success" | "failure" | "running";

export type ScheduledJobRecord = {
  id: number;
  code: string;
  name: string;
  description: string;
  cron_expr: string;
  enabled: boolean;
  active: boolean;
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
