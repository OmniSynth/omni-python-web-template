import { useCallback, useEffect, useState } from "react";
import { useGlobalPageSize } from "@/hooks/use-global-page-size";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { useTablePreferences } from "@/hooks/useTablePreferences";
import { api } from "@/lib/api";
import { notifyExportJobsChanged } from "@/lib/export-jobs-events";
import { errorMessage, showToastError, showToastSuccess } from "@/lib/form-feedback";
import { REALTIME_CHANNELS } from "@/lib/realtime/ws-client";
import type { ExportJobRecord } from "@/types/export-job";
import { useDownloadCenterColumns } from "./use-download-center-columns";

const PAGE_KEY = "download_center";
const TABLE_KEY = "main";

function openOssDownload(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function useDownloadCenterPage() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { pageSize, setPageSize } = useGlobalPageSize();
  const [rows, setRows] = useState<ExportJobRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pageLoadError, setPageLoadError] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.exportJobs.list({
        keyword: keyword.trim() || undefined,
        status: status || undefined,
        page,
        page_size: pageSize,
      });
      setRows(res.items);
      setTotal(res.total);
      setPageLoadError("");
      try {
        await api.exportJobs.markRead();
        notifyExportJobsChanged();
      } catch {
        // 套餐过期等场景允许失败，下载仍会单独已读
      }
    } catch (error) {
      setPageLoadError(errorMessage(error, "加载失败"));
    }
  }, [keyword, status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const onMineEvent = useCallback(() => {
    void load();
  }, [load]);

  useRealtimeChannel(REALTIME_CHANNELS.exportJobMine, onMineEvent, true);

  const onDownload = useCallback(async (row: ExportJobRecord) => {
    const url = row.public_url.trim();
    if (!url) {
      showToastError(row.status === "done" ? "导出文件已过期，请重新导出" : "导出尚未完成");
      return;
    }
    setDownloadingId(row.id);
    try {
      openOssDownload(url);
      try {
        await api.exportJobs.markJobRead(row.id);
        notifyExportJobsChanged();
      } catch {
        // 已读失败不影响下载
      }
      showToastSuccess("已开始下载");
    } catch (error) {
      showToastError(errorMessage(error, "下载失败"));
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const columns = useDownloadCenterColumns(downloadingId, (row) => void onDownload(row));
  const tablePrefs = useTablePreferences<ExportJobRecord>({
    pageKey: PAGE_KEY,
    tableKey: TABLE_KEY,
    defaultColumns: columns,
  });

  return {
    keyword,
    setKeyword: (v: string) => {
      setKeyword(v);
      setPage(1);
    },
    status,
    setStatus: (v: string) => {
      setStatus(v);
      setPage(1);
    },
    page,
    pageSize,
    setPage,
    setPageSize,
    rows,
    total,
    pageLoadError,
    columns,
    tablePrefs,
  };
}
