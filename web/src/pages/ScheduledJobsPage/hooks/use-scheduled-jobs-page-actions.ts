import { useCallback } from "react";
import { api } from "@/lib/api";
import { TRIGGER_ACCEPTED_MSG } from "@/lib/api/scheduled-jobs";
import { showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { ScheduledJobRecord } from "@/types/scheduled-job";

type TenantSheetMode = "trigger" | "stop";

type ScheduledJobActionsOptions = {
  load: () => Promise<void>;
  editing: ScheduledJobRecord | null;
  cronExpr: string;
  targeting: ScheduledJobRecord | null;
  tenantSheetMode: TenantSheetMode;
  setActionCode: (code: string | null) => void;
  setSectionError: (message: string) => void;
  setSaving: (saving: boolean) => void;
  setSheetOpen: (open: boolean) => void;
  setEditing: (job: ScheduledJobRecord | null) => void;
  setTenantSheetOpen: (open: boolean) => void;
  setTargeting: (job: ScheduledJobRecord | null) => void;
  setTenantSheetMode: (mode: TenantSheetMode) => void;
  setTenantSheetError: (message: string) => void;
  setTenantSheetSubmitting: (submitting: boolean) => void;
};

function needsTenant(job: ScheduledJobRecord): boolean {
  return job.scope === "tenant" || job.requires_tenant;
}

export function useScheduledJobsPageActions({
  load,
  editing,
  cronExpr,
  targeting,
  tenantSheetMode,
  setActionCode,
  setSectionError,
  setSaving,
  setSheetOpen,
  setEditing,
  setTenantSheetOpen,
  setTargeting,
  setTenantSheetMode,
  setTenantSheetError,
  setTenantSheetSubmitting,
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

  const openExecute = useCallback(
    (job: ScheduledJobRecord) => {
      if (!needsTenant(job)) {
        void runAction(job, () => api.scheduledJobs.trigger(job.code), TRIGGER_ACCEPTED_MSG);
        return;
      }
      setTenantSheetMode("trigger");
      setTargeting(job);
      setTenantSheetError("");
      setTenantSheetOpen(true);
    },
    [runAction, setTargeting, setTenantSheetError, setTenantSheetMode, setTenantSheetOpen],
  );

  const openStop = useCallback(
    (job: ScheduledJobRecord) => {
      if (!needsTenant(job)) {
        void runAction(job, () => api.scheduledJobs.stop(job.code), `已停止「${job.name}」`);
        return;
      }
      setTenantSheetMode("stop");
      setTargeting(job);
      setTenantSheetError("");
      setTenantSheetOpen(true);
    },
    [runAction, setTargeting, setTenantSheetError, setTenantSheetMode, setTenantSheetOpen],
  );

  const handleConfirmTenantSheet = useCallback(
    async (tenantId: number) => {
      if (!targeting) return;
      setTenantSheetSubmitting(true);
      setTenantSheetError("");
      setActionCode(targeting.code);
      try {
        if (tenantSheetMode === "stop") {
          await api.scheduledJobs.stop(targeting.code, { tenant_id: tenantId });
          showToastSuccess(`已停止「${targeting.name}」在所选租户的调度`);
        } else {
          const result = await api.scheduledJobs.trigger(targeting.code, { tenant_id: tenantId });
          showToastSuccess(result.message || TRIGGER_ACCEPTED_MSG);
        }
        setTenantSheetOpen(false);
        setTargeting(null);
        await load();
      } catch (error) {
        setTenantSheetError(error instanceof Error ? error.message : "操作失败");
      } finally {
        setTenantSheetSubmitting(false);
        setActionCode(null);
      }
    },
    [
      load,
      setActionCode,
      setTargeting,
      setTenantSheetError,
      setTenantSheetOpen,
      setTenantSheetSubmitting,
      targeting,
      tenantSheetMode,
    ],
  );

  const handleStart = useCallback(
    (job: ScheduledJobRecord) => runAction(job, () => api.scheduledJobs.start(job.code), `已启动「${job.name}」`),
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
    openExecute,
    openStop,
    handleConfirmTenantSheet,
    handleStart,
    handleSave,
  };
}
