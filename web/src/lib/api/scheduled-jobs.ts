import { json } from "@/lib/api/client";
import type { ScheduledJobRecord } from "@/types/scheduled-job";

export const scheduledJobsApi = {
  list: () => json<ScheduledJobRecord[]>("/api/v1/scheduled-jobs"),
  get: (code: string) => json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}`),
  update: (code: string, body: { cron_expr?: string; enabled?: boolean }) =>
    json<ScheduledJobRecord>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  trigger: (code: string) =>
    json<{ status: string; message?: string }>(`/api/v1/scheduled-jobs/${encodeURIComponent(code)}/trigger`, {
      method: "POST",
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
