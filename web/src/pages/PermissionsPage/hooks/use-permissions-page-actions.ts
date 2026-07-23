import type { Dispatch, RefObject, SetStateAction } from "react";
import { api } from "@/lib/api";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type { PermissionRecord } from "@/types/auth";

export function usePermissionsNameEdit({
  editingRecord,
  draftName,
  nameInputRef,
  nameBlurTimerRef,
  setEditingCode,
  setDraftName,
  setNameFocused,
  load,
  refreshAuth,
}: {
  editingRecord: PermissionRecord | null;
  draftName: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  nameBlurTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  setEditingCode: Dispatch<SetStateAction<string | null>>;
  setDraftName: Dispatch<SetStateAction<string>>;
  setNameFocused: Dispatch<SetStateAction<boolean>>;
  load: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}) {
  function clearNameBlurTimer() {
    if (nameBlurTimerRef.current != null) {
      clearTimeout(nameBlurTimerRef.current);
      nameBlurTimerRef.current = null;
    }
  }

  function handleNameFocus() {
    clearNameBlurTimer();
    setNameFocused(true);
  }

  function handleNameBlur() {
    clearNameBlurTimer();
    nameBlurTimerRef.current = setTimeout(() => {
      nameBlurTimerRef.current = null;
      cancelNameEdit();
    }, 120);
  }

  function startNameEdit(record: PermissionRecord) {
    clearNameBlurTimer();
    setEditingCode(record.code);
    setDraftName(record.name);
    setNameFocused(true);
    queueMicrotask(() => nameInputRef.current?.focus());
  }

  function cancelNameEdit() {
    clearNameBlurTimer();
    setEditingCode(null);
    setDraftName("");
    setNameFocused(false);
  }

  async function handleSaveName() {
    if (!editingRecord) return;
    try {
      await api.permissions.update(editingRecord.id, {
        name: draftName.trim(),
      });
      cancelNameEdit();
      await load();
      await refreshAuth();
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    }
  }

  return {
    handleNameFocus,
    handleNameBlur,
    startNameEdit,
    cancelNameEdit,
    handleSaveName,
  };
}

export function usePermissionsTreeMove({
  canUpdate,
  recordMap,
  records,
  load,
  refreshAuth,
}: {
  canUpdate: boolean;
  recordMap: Map<string, PermissionRecord>;
  records: PermissionRecord[];
  load: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}) {
  return async (dragCode: string, targetCode: string) => {
    if (!canUpdate || dragCode === targetCode) return;
    const dragged = recordMap.get(dragCode);
    const target = recordMap.get(targetCode);
    if (!dragged || !target) return;
    if (!["catalog", "menu"].includes(dragged.kind) || !["catalog", "menu"].includes(target.kind)) {
      return;
    }

    try {
      if (dragged.kind === "catalog" && target.kind === "catalog") {
        const siblings = records
          .filter((record) => record.kind === "catalog")
          .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
        const ordered = siblings.map((record) => record.code);
        const from = ordered.indexOf(dragCode);
        const to = ordered.indexOf(targetCode);
        if (from < 0 || to < 0) return;
        ordered.splice(to, 0, ordered.splice(from, 1)[0]);
        await Promise.all(
          ordered.map((code, index) => api.permissions.update(recordMap.get(code)!.id, { sort_order: index })),
        );
      }

      if (dragged.kind === "menu") {
        const nextParentId = target.kind === "catalog" ? target.id : (target.parent_id ?? null);
        if (nextParentId == null) return;
        const siblings = records
          .filter((record) => record.kind === "menu" && (record.parent_id === nextParentId || record.code === dragCode))
          .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
          .map((record) => record.code);
        const existing = siblings.filter((code) => code !== dragCode);
        const targetIndex = target.kind === "catalog" ? existing.length : existing.indexOf(target.code);
        if (targetIndex < 0) return;
        existing.splice(targetIndex, 0, dragCode);
        await api.permissions.update(dragged.id, { parent_id: nextParentId });
        await Promise.all(
          existing.map((code, index) => api.permissions.update(recordMap.get(code)!.id, { sort_order: index })),
        );
      }

      await load();
      await refreshAuth();
    } catch (err) {
      showToastError(errorMessage(err, "拖动排序失败"));
    }
  };
}
