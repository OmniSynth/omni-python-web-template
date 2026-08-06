import { useCallback, useEffect, useState } from "react";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { api } from "@/lib/api";
import { EXPORT_JOBS_CHANGED_EVENT, notifyExportJobsChanged } from "@/lib/export-jobs-events";
import { REALTIME_CHANNELS } from "@/lib/realtime/ws-client";

export type ExportJobBadgeTone = "none" | "active" | "done";

export type ExportJobBadgeState = {
  activeCount: number;
  doneUnreadCount: number;
  /** 展示数量：完成未读优先，否则进行中。 */
  count: number;
  /** 完成绿 > 进行中蓝。 */
  tone: ExportJobBadgeTone;
};

function toBadgeState(activeCount: number, doneUnreadCount: number): ExportJobBadgeState {
  const active = Math.max(0, activeCount);
  const done = Math.max(0, doneUnreadCount);
  if (done > 0) {
    return { activeCount: active, doneUnreadCount: done, count: done, tone: "done" };
  }
  if (active > 0) {
    return { activeCount: active, doneUnreadCount: done, count: active, tone: "active" };
  }
  return { activeCount: 0, doneUnreadCount: 0, count: 0, tone: "none" };
}

const EMPTY_BADGE = toBadgeState(0, 0);

function readBadgePayload(payload: Record<string, unknown>): ExportJobBadgeState {
  const active = Number(payload.active_count ?? 0);
  const done = Number(payload.done_unread_count ?? 0);
  return toBadgeState(Number.isFinite(active) ? active : 0, Number.isFinite(done) ? done : 0);
}

/** 顶栏下载中心角标：进行中蓝 / 完成未读绿（绿优先）；由实时通道推送。 */
export function useExportJobBadge(enabled: boolean) {
  const [badge, setBadge] = useState<ExportJobBadgeState>(EMPTY_BADGE);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setBadge(EMPTY_BADGE);
      return;
    }
    try {
      const res = await api.exportJobs.badge();
      setBadge(toBadgeState(res.active_count, res.done_unread_count));
    } catch {
      // 无权限或网络失败时不打断顶栏
    }
  }, [enabled]);

  /** 进入下载中心：清完成未读；进行中蓝角标保持。 */
  const markVisited = useCallback(async () => {
    if (!enabled) return;
    setBadge((prev) => toBadgeState(prev.activeCount, 0));
    try {
      await api.exportJobs.markRead();
      notifyExportJobsChanged();
    } catch {
      void refresh();
    }
  }, [enabled, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onChanged = () => void refresh();
    window.addEventListener(EXPORT_JOBS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(EXPORT_JOBS_CHANGED_EVENT, onChanged);
  }, [enabled, refresh]);

  const onBadgeEvent = useCallback(
    (event: { payload: Record<string, unknown> }) => {
      if (!enabled) return;
      setBadge(readBadgePayload(event.payload));
    },
    [enabled],
  );

  useRealtimeChannel(REALTIME_CHANNELS.exportJobBadge, onBadgeEvent, enabled);

  return { badge, markVisited };
}
