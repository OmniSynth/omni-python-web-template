import { json } from "@/lib/api/client";
import type {
  PaginatedScheduledJobRuns,
  ScheduledJobRecord,
  ScheduledJobRunRecord,
  ScheduledJobRunStatus,
  ScheduledJobTenantOptionPage,
  ScheduledJobTriggerType,
  TenantScheduledJobRecord,
} from "@/types/scheduled-job";

export const TRIGGER_ACCEPTED_MSG = "同步任务已开始执行";

export type ScheduledJobRunsQuery = {
  tenant_id?: number;
  status?: ScheduledJobRunStatus;
  trigger_type?: ScheduledJobTriggerType;
  started_from?: string;
  started_to?: string;
  page?: number;
  page_size?: number;
};

function runsQueryString(params?: ScheduledJobRunsQuery): string {
  const search = new URLSearchParams();
  if (params?.tenant_id != null) search.set("tenant_id", String(params.tenant_id));
  if (params?.status) search.set("status", params.status);
  if (params?.trigger_type) search.set("trigger_type", params.trigger_type);
  if (params?.started_from) search.set("started_from", params.started_from);
  if (params?.started_to) search.set("started_to", params.started_to);
  if (params?.page != null) search.set("page", String(params.page));
  if (params?.page_size != null) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const scheduledJobsApi = {
  list: () => json<ScheduledJobRecord[]>("/api/v1/scheduled-jobs"),
  get: (code: string) => json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}`),
  update: (code: string, body: { cron_expr?: string; enabled?: boolean }) =>
    json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  tenantOptions: (params?: { q?: string; page?: number; page_size?: number }) => {
    const search = new URLSearchParams();
    if (params?.q?.trim()) search.set("q", params.q.trim());
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.page_size != null) search.set("page_size", String(params.page_size));
    const qs = search.toString();
    return json<ScheduledJobTenantOptionPage>(`/api/v1/scheduled-jobs/tenant-options${qs ? `?${qs}` : ""}`);
  },
  listRuns: (code: string, params?: ScheduledJobRunsQuery) =>
    json<PaginatedScheduledJobRuns>(
      `/api/v1/scheduled-jobs/${encodeURIComponent(code)}/runs${runsQueryString(params)}`,
    ),
  getRun: (runId: string) => json<ScheduledJobRunRecord>(`/api/v1/scheduled-jobs/runs/${encodeURIComponent(runId)}`),
  trigger: (code: string, body?: { tenant_id?: number }) =>
    json<{ status: string; message?: string }>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}/trigger`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  start: (code: string) =>
    json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}/start`, {
      method: "POST",
    }),
  stop: (code: string, body?: { tenant_id?: number }) =>
    json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}/stop`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  listTenantJobs: () => json<TenantScheduledJobRecord[]>("/api/v1/tenant/scheduled-jobs"),
  listTenantRuns: (code: string, params?: ScheduledJobRunsQuery) =>
    json<PaginatedScheduledJobRuns>(
      `/api/v1/tenant/scheduled-jobs/${encodeURIComponent(code)}/runs${runsQueryString(params)}`,
    ),
  getTenantRun: (runId: string) =>
    json<ScheduledJobRunRecord>(`/api/v1/tenant/scheduled-jobs/runs/${encodeURIComponent(runId)}`),
  triggerTenantJob: (code: string) =>
    json<{ status: string; message?: string }>(`/api/v1/tenant/scheduled-jobs/${encodeURIComponent(code)}/trigger`, {
      method: "POST",
      body: "{}",
    }),
};
