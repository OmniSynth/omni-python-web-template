import { useMemo } from "react";
import { createActionsColumn } from "@/components/table/table-row-actions";
import { useTimezone } from "@/contexts/TimezoneContext";
import { EXPORT_JOB_STATUS_LABEL, type ExportJobRecord, type ExportJobStatus } from "@/types/export-job";
import type { TableColumnDef } from "@/types/table-preference";

function statusLabel(status: string): string {
  return EXPORT_JOB_STATUS_LABEL[status as ExportJobStatus] || status || "—";
}

/** 列表展示名：优先来源标签，否则「导出」。 */
export function exportListDisplayName(row: ExportJobRecord): string {
  return (row.source_label || "").trim() || "导出";
}

function formatProgress(row: ExportJobRecord): string {
  if (row.status === "done") {
    return row.row_count > 0 ? `${row.row_count} 条` : "—";
  }
  if (row.progress_total > 0) {
    return `${row.progress_current}/${row.progress_total}`;
  }
  if (row.progress_current > 0) {
    return String(row.progress_current);
  }
  return row.status === "queued" ? "等待中" : "—";
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useDownloadCenterColumns(
  downloadingId: number | null,
  onDownload: (row: ExportJobRecord) => void,
): TableColumnDef<ExportJobRecord>[] {
  const { formatDateTime } = useTimezone();
  return useMemo(
    () => [
      {
        id: "filename",
        label: "名称",
        defaultWidth: 260,
        render: (row) => <span className="line-clamp-2">{exportListDisplayName(row)}</span>,
      },
      {
        id: "source_label",
        label: "来源",
        defaultWidth: 140,
        render: (row) => row.source_label || "—",
      },
      {
        id: "status",
        label: "状态",
        defaultWidth: 100,
        render: (row) => statusLabel(row.status),
      },
      {
        id: "progress",
        label: "进度",
        defaultWidth: 110,
        render: (row) => formatProgress(row),
      },
      {
        id: "file_size",
        label: "大小",
        defaultWidth: 90,
        render: (row) => formatFileSize(row.file_size),
      },
      {
        id: "error_message",
        label: "说明",
        defaultWidth: 200,
        render: (row) =>
          row.status === "failed" ? (
            <span className="line-clamp-2 text-destructive">{row.error_message || "导出失败"}</span>
          ) : (
            "—"
          ),
      },
      {
        id: "created_at",
        label: "创建时间",
        defaultWidth: 170,
        render: (row) => (row.created_at ? formatDateTime(row.created_at) : "—"),
      },
      {
        id: "expires_at",
        label: "过期时间",
        defaultWidth: 170,
        render: (row) => (row.expires_at ? formatDateTime(row.expires_at) : "—"),
      },
      createActionsColumn({
        defaultWidth: 100,
        actionDefs: [{ id: "download", label: "下载" }],
        renderItems: (row) => [
          {
            id: "download",
            label: downloadingId === row.id ? "下载中…" : "下载",
            permission: "export.job.list",
            disabled: row.status !== "done" || !row.public_url || downloadingId === row.id,
            onClick: () => onDownload(row),
          },
        ],
      }),
    ],
    [formatDateTime, downloadingId, onDownload],
  );
}
