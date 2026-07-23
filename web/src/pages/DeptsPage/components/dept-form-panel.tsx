import { DeptTreePicker, formatParentLabel } from "@/components/dept/dept-tree-picker";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { DeptRecord } from "@/types/auth";
import type { DeptFormMode } from "../types";

type DeptFormPanelProps = {
  tree: DeptRecord[];
  formMode: DeptFormMode;
  selectedDept: DeptRecord | null;
  editingIsRoot: boolean;
  parentId: string;
  setParentId: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  saving: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  hasRoot: boolean;
  showParentField: boolean;
  isRootForm: boolean;
  parentDeptName: string;
  parentExcludeIds: Set<number>;
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  onSave: () => void;
  onSelectDept: (dept: DeptRecord) => void;
  onOpenCreate: (parent: DeptRecord | null) => void;
  onCancelCreate: () => void;
  onDelete: (dept: DeptRecord) => void;
};

export function DeptFormPanel({
  tree,
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
  canCreate,
  canUpdate,
  canDelete,
  hasRoot,
  showParentField,
  isRootForm,
  parentDeptName,
  parentExcludeIds,
  fieldErrors,
  clearFieldError,
  onSave,
  onSelectDept,
  onOpenCreate,
  onCancelCreate,
  onDelete,
}: DeptFormPanelProps) {
  return (
    <div className="surface-glass rounded-lg border p-4">
      {formMode === "create" ? (
        <div className="grid gap-4">
          <div>
            <p className="text-xs text-muted-foreground">新建部门</p>
            <p className="mt-1 text-lg font-medium">填写部门信息</p>
          </div>
          {showParentField ? (
            <FormField label="上级部门" htmlFor="dept-parent">
              <DeptTreePicker
                id="dept-parent"
                tree={tree}
                value={parentId}
                excludeIds={parentExcludeIds}
                rootOption={!hasRoot ? { value: "0", label: "无（顶级）" } : undefined}
                placeholder="选择上级部门"
                onChange={setParentId}
              />
            </FormField>
          ) : null}
          <FormField label="部门名称" htmlFor="dept-name" required error={fieldErrors.name}>
            <Input
              id="dept-name"
              value={name}
              aria-invalid={!!fieldErrors.name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
            />
          </FormField>
          {!isRootForm ? (
            <FormField label="启用" htmlFor="dept-enabled">
              <Switch id="dept-enabled" checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
            </FormField>
          ) : null}
          <div className="flex flex-nowrap justify-end gap-2 overflow-x-auto pt-2">
            <Button type="button" onClick={onSave} disabled={saving || !canCreate}>
              创建
            </Button>
            {selectedDept ? (
              <Button type="button" variant="secondary" onClick={() => onSelectDept(selectedDept)}>
                取消
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={onCancelCreate}>
                取消
              </Button>
            )}
          </div>
        </div>
      ) : !selectedDept ? (
        tree.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">暂无部门</p>
            {canCreate ? (
              <Button type="button" onClick={() => onOpenCreate(null)}>
                新建部门
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">请选择左侧部门</p>
        )
      ) : (
        <div className="grid gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{editingIsRoot ? "顶级部门" : "子部门"}</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-lg font-medium">{selectedDept.name}</p>
              {!editingIsRoot ? (
                <p className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
                  {formatParentLabel(parentDeptName)}
                </p>
              ) : null}
            </div>
          </div>
          {showParentField ? (
            <FormField label="上级部门" htmlFor="dept-parent-edit">
              <DeptTreePicker
                id="dept-parent-edit"
                tree={tree}
                value={parentId}
                excludeIds={parentExcludeIds}
                disabled={!canUpdate}
                placeholder="选择上级部门"
                onChange={setParentId}
              />
            </FormField>
          ) : null}
          <FormField label="部门名称" htmlFor="dept-name-edit" required error={fieldErrors.name}>
            <Input
              id="dept-name-edit"
              value={name}
              disabled={!canUpdate}
              aria-invalid={!!fieldErrors.name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
            />
          </FormField>
          {!editingIsRoot ? (
            <FormField label="启用" htmlFor="dept-enabled-edit">
              <Switch
                id="dept-enabled-edit"
                checked={enabled}
                disabled={!canUpdate}
                onCheckedChange={(checked) => setEnabled(checked === true)}
              />
            </FormField>
          ) : null}
          <div className="flex flex-nowrap justify-end gap-2 overflow-x-auto pt-2">
            {canCreate ? (
              <Button type="button" variant="secondary" onClick={() => onOpenCreate(selectedDept)}>
                新建子部门
              </Button>
            ) : null}
            {canUpdate ? (
              <Button type="button" onClick={onSave} disabled={saving}>
                保存
              </Button>
            ) : null}
            {canDelete && !editingIsRoot ? (
              <Button type="button" variant="destructive" onClick={() => onDelete(selectedDept)}>
                删除
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
