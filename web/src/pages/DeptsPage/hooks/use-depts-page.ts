import { useEffect } from "react";
import { useDeptsPageActions } from "./use-depts-page-actions";
import { useDeptsPageForm } from "./use-depts-page-form";
import { buildDeptsPageReturn } from "./use-depts-page-return";
import { useDeptsPageState } from "./use-depts-page-state";

export function useDeptsPage() {
  const state = useDeptsPageState();

  useEffect(() => {
    if (state.formMode !== "edit" || !state.selectedDept) return;
    state.setEditingId(state.selectedDept.id);
    state.setEditingIsRoot(state.selectedDept.parent_id === 0);
    state.setParentId(String(state.selectedDept.parent_id));
    state.setName(state.selectedDept.name);
    state.setEnabled(state.selectedDept.enabled);
    state.clearFieldErrors();
  }, [
    state.selectedDept,
    state.formMode,
    state.clearFieldErrors,
    state.setEditingId,
    state.setEditingIsRoot,
    state.setParentId,
    state.setName,
    state.setEnabled,
  ]);

  const actions = useDeptsPageActions({
    canUpdate: state.canUpdate,
    deptApi: state.deptApi,
    tree: state.tree,
    flatDepts: state.flatDepts,
    formMode: state.formMode,
    editingId: state.editingId,
    editingIsRoot: state.editingIsRoot,
    parentId: state.parentId,
    name: state.name,
    enabled: state.enabled,
    hasRoot: state.hasRoot,
    deleteTarget: state.deleteTarget,
    selectedId: state.selectedId,
    load: state.load,
    setFormMode: state.setFormMode,
    setSelectedId: state.setSelectedId,
    setDeleteTarget: state.setDeleteTarget,
    setSaving: state.setSaving,
    setDeleting: state.setDeleting,
    setFieldErrors: state.setFieldErrors,
    clearFieldErrors: state.clearFieldErrors,
  });

  const form = useDeptsPageForm({
    formMode: state.formMode,
    editingIsRoot: state.editingIsRoot,
    parentId: state.parentId,
    flatDepts: state.flatDepts,
    hasRoot: state.hasRoot,
    rootDept: state.rootDept,
    clearFieldErrors: state.clearFieldErrors,
    setFormMode: state.setFormMode,
    setSelectedId: state.setSelectedId,
    setEditingId: state.setEditingId,
    setEditingIsRoot: state.setEditingIsRoot,
    setParentId: state.setParentId,
    setName: state.setName,
    setEnabled: state.setEnabled,
  });

  return buildDeptsPageReturn({ state, form, actions });
}
