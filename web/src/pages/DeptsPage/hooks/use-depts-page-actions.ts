import type { Dispatch, SetStateAction } from "react";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type { DeptRecord } from "@/types/auth";
import type { DeptFormMode } from "../types";
import { collectDescendantIds, nextSortOrder } from "../utils";

type DeptApi = {
  tree: () => Promise<DeptRecord[]>;
  create: (body: { parent_id: number; name: string; sort_order: number; enabled: boolean }) => Promise<DeptRecord>;
  update: (
    id: number,
    body: { parent_id?: number; name?: string; sort_order?: number; enabled?: boolean },
  ) => Promise<DeptRecord>;
  delete: (id: number) => Promise<void>;
};

export function useDeptsPageActions({
  canUpdate,
  deptApi,
  tree,
  flatDepts,
  formMode,
  editingId,
  editingIsRoot,
  parentId,
  name,
  enabled,
  hasRoot,
  deleteTarget,
  selectedId,
  load,
  setFormMode,
  setSelectedId,
  setDeleteTarget,
  setSaving,
  setDeleting,
  setFieldErrors,
  clearFieldErrors,
}: {
  canUpdate: boolean;
  deptApi: DeptApi;
  tree: DeptRecord[];
  flatDepts: DeptRecord[];
  formMode: DeptFormMode;
  editingId: number | null;
  editingIsRoot: boolean;
  parentId: string;
  name: string;
  enabled: boolean;
  hasRoot: boolean;
  deleteTarget: DeptRecord | null;
  selectedId: number | null;
  load: () => Promise<void>;
  setFormMode: Dispatch<SetStateAction<DeptFormMode>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setDeleteTarget: Dispatch<SetStateAction<DeptRecord | null>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  setDeleting: Dispatch<SetStateAction<boolean>>;
  setFieldErrors: (errors: Record<string, string>) => void;
  clearFieldErrors: () => void;
}) {
  const moveDept = async (dragId: number, targetId: number) => {
    if (!canUpdate || dragId === targetId) return;

    const dragged = flatDepts.find((dept) => dept.id === dragId);
    const target = flatDepts.find((dept) => dept.id === targetId);
    if (!dragged || !target) return;

    const descendantIds = collectDescendantIds(tree, dragId);
    if (descendantIds.has(targetId)) return;

    const nextParentId = target.parent_id;
    if (dragged.parent_id === 0 && nextParentId !== 0) return;
    if (nextParentId === 0 && dragged.parent_id !== 0) return;

    try {
      const siblings = flatDepts
        .filter((dept) => dept.parent_id === nextParentId || dept.id === dragId)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .map((dept) => dept.id);
      const ordered = siblings.filter((id) => id !== dragId);
      const targetIndex = ordered.indexOf(targetId);
      if (targetIndex < 0) return;
      ordered.splice(targetIndex, 0, dragId);

      if (dragged.parent_id !== nextParentId) {
        await deptApi.update(dragId, { parent_id: nextParentId });
      }
      await Promise.all(ordered.map((id, index) => deptApi.update(id, { sort_order: index })));
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "拖动排序失败"));
    }
  };

  async function handleSave() {
    clearFieldErrors();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "请填写部门名称";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        const pid = Number(parentId);
        if (hasRoot && pid === 0) {
          showToastError("租户只能有一个顶级部门");
          return;
        }
        const created = await deptApi.create({
          parent_id: pid,
          name: name.trim(),
          sort_order: nextSortOrder(flatDepts, pid),
          enabled: pid === 0 ? true : enabled,
        });
        setFormMode("edit");
        setSelectedId(created.id);
      } else if (editingId != null) {
        const body = editingIsRoot
          ? { name: name.trim() }
          : {
              parent_id: Number(parentId),
              name: name.trim(),
              enabled,
            };
        await deptApi.update(editingId, body);
      }
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deptApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
      }
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "删除失败"));
    } finally {
      setDeleting(false);
    }
  }

  return { moveDept, handleSave, handleDelete };
}
