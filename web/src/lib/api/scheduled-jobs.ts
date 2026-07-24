import { json } from "@/lib/api/client";
import type { ScheduledJobRecord, ScheduledJobTenantOptionPage } from "@/types/scheduled-job";

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
  trigger: (code: string, body?: { tenant_id?: number }) =>
    json<{ status: string; message?: string }>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}/trigger`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    }),
  start: (code: string) =>
    json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}/start`, {
      method: "POST",
    }),
  stop: (code: string) =>
    json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}/stop`, {
      method: "POST",
    }),
};
