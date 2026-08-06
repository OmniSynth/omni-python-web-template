/** 下载中心 / 导出任务类型。 */

export type ExportJobStatus = "queued" | "running" | "done" | "failed";

export type ExportJobRecord = {
  id: number;
  source_type: string;
  source_label: string;
  status: ExportJobStatus;
  progress_current: number;
  progress_total: number;
  filename: string;
  content_type: string;
  file_size: number;
  row_count: number;
  error_message: string;
  public_url: string;
  expires_at: string | null;
  read_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PaginatedExportJob = {
  items: ExportJobRecord[];
  total: number;
  page: number;
  page_size: number;
};

export type ExportJobCreateResult = {
  job_id: number;
  message: string;
};

export type ExportJobBadge = {
  active_count: number;
  done_unread_count: number;
};

export type ExportJobMarkReadResult = {
  marked: number;
};

export const EXPORT_JOB_STATUS_LABEL: Record<ExportJobStatus, string> = {
  queued: "排队中",
  running: "导出中",
  done: "已完成",
  failed: "失败",
};
