import { json } from "@/lib/api/client";
import { buildQuery } from "@/lib/api/query";
import type {
  ExportJobBadge,
  ExportJobCreateResult,
  ExportJobMarkReadResult,
  ExportJobRecord,
  PaginatedExportJob,
} from "@/types/export-job";

export const exportJobsApi = {
  list: (params: { keyword?: string; status?: string; page?: number; page_size?: number }) =>
    json<PaginatedExportJob>(`/api/v1/export-jobs?${buildQuery(params)}`),
  badge: () => json<ExportJobBadge>("/api/v1/export-jobs/badge"),
  markRead: () => json<ExportJobMarkReadResult>("/api/v1/export-jobs/mark-read", { method: "POST" }),
  markJobRead: (jobId: number) =>
    json<ExportJobMarkReadResult>(`/api/v1/export-jobs/${jobId}/mark-read`, { method: "POST" }),
  get: (jobId: number) => json<ExportJobRecord>(`/api/v1/export-jobs/${jobId}`),
};

export type { ExportJobCreateResult };
