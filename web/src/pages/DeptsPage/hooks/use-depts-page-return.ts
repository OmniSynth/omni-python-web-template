import type { useDeptsPageActions } from "./use-depts-page-actions";
import type { useDeptsPageForm } from "./use-depts-page-form";
import type { useDeptsPageState } from "./use-depts-page-state";

export function buildDeptsPageReturn({
  state,
  form,
  actions,
}: {
  state: ReturnType<typeof useDeptsPageState>;
  form: ReturnType<typeof useDeptsPageForm>;
  actions: ReturnType<typeof useDeptsPageActions>;
}) {
  return {
    canCreate: state.canCreate,
    canUpdate: state.canUpdate,
    canDelete: state.canDelete,
    tree: state.tree,
    pageLoadError: state.pageLoadError,
    selectedId: state.selectedId,
    formMode: state.formMode,
    selectedDept: state.selectedDept,
    editingIsRoot: state.editingIsRoot,
    parentId: state.parentId,
    setParentId: state.setParentId,
    name: state.name,
    setName: state.setName,
    enabled: state.enabled,
    setEnabled: state.setEnabled,
    saving: state.saving,
    deleteTarget: state.deleteTarget,
    setDeleteTarget: state.setDeleteTarget,
    deleting: state.deleting,
    parentNameById: state.parentNameById,
    hasRoot: state.hasRoot,
    parentExcludeIds: state.parentExcludeIds,
    fieldErrors: state.fieldErrors,
    clearFieldError: state.clearFieldError,
    showParentField: form.showParentField,
    isRootForm: form.isRootForm,
    parentDeptName: form.parentDeptName,
    moveDept: actions.moveDept,
    selectDept: form.selectDept,
    openCreate: form.openCreate,
    cancelCreate: form.cancelCreate,
    handleSave: actions.handleSave,
    handleDelete: actions.handleDelete,
  };
}
