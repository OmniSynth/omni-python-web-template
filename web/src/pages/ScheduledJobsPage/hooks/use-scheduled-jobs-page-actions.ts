import { useCallback } from "react";
import { api } from "@/lib/api";
import { showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { ScheduledJobRecord } from "@/types/scheduled-job";

type ScheduledJobActionsOptions = {
  load: () => Promise<void>;
  editing: ScheduledJobRecord | null;
  cronExpr: string;
  setActionCode: (code: string | null) => void;
  setSectionError: (message: string) => void;
  setSaving: (saving: boolean) => void;
  setSheetOpen: (open: boolean) => void;
  setEditing: (job: ScheduledJobRecord | null) => void;
};

export function useScheduledJobsPageActions({
  load,
  editing,
  cronExpr,
  setActionCode,
  setSectionError,
  setSaving,
  setSheetOpen,
  setEditing,
}: ScheduledJobActionsOptions) {
  const runAction = useCallback(
    async (job: ScheduledJobRecord, action: () => Promise<unknown>, successMessage: string) => {
      setActionCode(job.code);
      try {
        const result = await action();
        const message =
          typeof result === "object" &&
          result !== null &&
          "message" in result &&
          typeof result.message === "string" &&
          result.message
            ? result.message
            : successMessage;
        showToastSuccess(message);
        await load();
      } catch (error) {
        showToastError(error instanceof Error ? error.message : "操作失败");
      } finally {
        setActionCode(null);
      }
    },
    [load, setActionCode],
  );

  const handleTrigger = useCallback(
    (job: ScheduledJobRecord) =>
      runAction(job, () => api.scheduledJobs.trigger(job.code), "同步任务已开始，请稍后刷新查看结果"),
    [runAction],
  );

  const handleStart = useCallback(
    (job: ScheduledJobRecord) => runAction(job, () => api.scheduledJobs.start(job.code), `已启动「${job.name}」`),
    [runAction],
  );

  const handleStop = useCallback(
    (job: ScheduledJobRecord) => runAction(job, () => api.scheduledJobs.stop(job.code), `已停止「${job.name}」`),
    [runAction],
  );

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    setSectionError("");
    try {
      await api.scheduledJobs.update(editing.code, { cron_expr: cronExpr });
      showToastSuccess("定时任务已更新");
      setSheetOpen(false);
      setEditing(null);
      await load();
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [cronExpr, editing, load, setEditing, setSaving, setSectionError, setSheetOpen]);

  return {
    handleTrigger,
    handleStart,
    handleStop,
    handleSave,
  };
}
