import { Page, PageBody, PageHeader, PageMessage } from "@/components/layout/AppShell";
import { DeptDeleteDialog } from "./components/dept-delete-dialog";
import { DeptFormPanel } from "./components/dept-form-panel";
import { DeptTreePanel } from "./components/dept-tree-panel";
import { useDeptsPage } from "./hooks/use-depts-page";

export function DeptsPage() {
  const {
    canCreate,
    canUpdate,
    tree,
    pageLoadError,
    selectedId,
    formMode,
    selectedDept,
    editingIsRoot,
    parentId,
    setParentId,
    name,
    setName,
    enabled,
    setEnabled,
    saving,
    deleteTarget,
    setDeleteTarget,
    deleting,
    parentNameById,
    hasRoot,
    parentExcludeIds,
    fieldErrors,
    clearFieldError,
    showParentField,
    isRootForm,
    parentDeptName,
    moveDept,
    selectDept,
    openCreate,
    cancelCreate,
    handleSave,
    handleDelete,
    canDelete,
  } = useDeptsPage();

  return (
    <Page>
      <PageHeader title="部门管理" subtitle={canUpdate ? "左侧拖动排序；右侧编辑部门" : "请选择部门查看详情"} />
      <PageBody layout="panels">
        {pageLoadError ? <PageMessage variant="error">{pageLoadError}</PageMessage> : null}
        <div className="min-h-0 flex-1 overflow-auto overscroll-none px-6 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(300px,420px)_1fr]">
            <DeptTreePanel
              tree={tree}
              selectedId={selectedId}
              canUpdate={canUpdate}
              parentNameById={parentNameById}
              onSelect={selectDept}
              onMove={moveDept}
            />
            <DeptFormPanel
              tree={tree}
              formMode={formMode}
              selectedDept={selectedDept}
              editingIsRoot={editingIsRoot}
              parentId={parentId}
              setParentId={setParentId}
              name={name}
              setName={setName}
              enabled={enabled}
              setEnabled={setEnabled}
              saving={saving}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              hasRoot={hasRoot}
              showParentField={showParentField}
              isRootForm={isRootForm}
              parentDeptName={parentDeptName}
              parentExcludeIds={parentExcludeIds}
              fieldErrors={fieldErrors}
              clearFieldError={clearFieldError}
              onSave={() => void handleSave()}
              onSelectDept={selectDept}
              onOpenCreate={openCreate}
              onCancelCreate={cancelCreate}
              onDelete={setDeleteTarget}
            />
          </div>
        </div>
      </PageBody>

      <DeptDeleteDialog
        deleteTarget={deleteTarget}
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </Page>
  );
}
