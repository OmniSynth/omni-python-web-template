import { DataScopeFields } from "@/components/dept/data-scope-fields";
import { DeptTreePicker } from "@/components/dept/dept-tree-picker";
import { FormField } from "@/components/form/form-field";
import { FormSectionError } from "@/components/form/form-section-error";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DeptRecord, UserTenantConfigItem } from "@/types/auth";
import type { SheetMode, TenantDraft } from "../types";
import { draftFromTenantConfig } from "../utils";
import { TenantConfigCardMeta } from "./tenant-config-card-meta";

export function UserTenantConfigSection({
  sheetMode,
  editingSelf,
  tenantConfigs,
  tenantDraft,
  deptCache,
  onToggleTenantBound,
  onSetTenantDept,
  onSetTenantDataScope,
  onToggleTenantCustomDeptScope,
  sectionError,
}: {
  sheetMode: SheetMode;
  editingSelf: boolean;
  tenantConfigs: UserTenantConfigItem[];
  tenantDraft: Record<number, TenantDraft>;
  deptCache: Record<number, DeptRecord[]>;
  onToggleTenantBound: (tenantId: number, bound: boolean) => void;
  onSetTenantDept: (tenantId: number, deptIdValue: number | null) => void;
  onSetTenantDataScope: (tenantId: number, dataScope: number) => void;
  onToggleTenantCustomDeptScope: (tenantId: number, deptId: number, checked: boolean) => void;
  sectionError: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>租户配置</Label>
      <div className="grid gap-3">
        {tenantConfigs.map((item) => {
          const draft = tenantDraft[item.tenant_id] ?? draftFromTenantConfig(item);
          const deptTree = deptCache[item.tenant_id] ?? [];
          const selfBoundLocked = sheetMode === "edit" && editingSelf && item.bound;
          return (
            <div key={item.tenant_id} className="surface-glass rounded-md border border-border p-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id={`tenant-bound-${item.tenant_id}`}
                  className="mt-1"
                  checked={draft.bound}
                  disabled={!item.tenant_enabled || selfBoundLocked}
                  onCheckedChange={(checked) => onToggleTenantBound(item.tenant_id, checked === true)}
                />
                <Label htmlFor={`tenant-bound-${item.tenant_id}`} className="min-w-0 flex-1 cursor-pointer font-normal">
                  <span className="text-sm font-medium">
                    {item.tenant_name}
                    {!item.tenant_enabled ? (
                      <span className="ml-2 text-xs text-muted-foreground">（已禁用）</span>
                    ) : null}
                  </span>
                  <TenantConfigCardMeta item={item} />
                </Label>
              </div>
              {draft.bound ? (
                <div className="mt-3 grid gap-2 pl-6">
                  <Label>
                    部门
                    <span className="text-destructive"> *</span>
                  </Label>
                  {deptTree.length === 0 ? (
                    <p className="text-xs text-muted-foreground">暂无部门，请先在部门管理中创建</p>
                  ) : (
                    <DeptTreePicker
                      tree={deptTree}
                      value={draft.dept_id != null ? String(draft.dept_id) : ""}
                      onlyEnabled
                      onChange={(value) => onSetTenantDept(item.tenant_id, Number(value))}
                    />
                  )}
                  <DataScopeFields
                    dataScope={draft.data_scope}
                    selectedDeptIds={new Set(draft.custom_scope_dept_ids)}
                    deptTree={deptTree}
                    onDataScopeChange={(value) => onSetTenantDataScope(item.tenant_id, value)}
                    onToggleDeptScope={(deptId, checked) =>
                      onToggleTenantCustomDeptScope(item.tenant_id, deptId, checked)
                    }
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <FormSectionError>{sectionError}</FormSectionError>
    </div>
  );
}

export function UserTenantScopeDeptField({
  currentTenantId,
  tenantDraft,
  deptCache,
  fieldErrors,
  onSetTenantDept,
}: {
  currentTenantId: number;
  tenantDraft: Record<number, TenantDraft>;
  deptCache: Record<number, DeptRecord[]>;
  fieldErrors: Record<string, string>;
  onSetTenantDept: (tenantId: number, deptIdValue: number | null) => void;
}) {
  return (
    <FormField label="部门" required error={fieldErrors.dept}>
      {(deptCache[currentTenantId] ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无部门，请先在部门管理中创建</p>
      ) : (
        <DeptTreePicker
          tree={deptCache[currentTenantId] ?? []}
          value={tenantDraft[currentTenantId]?.dept_id != null ? String(tenantDraft[currentTenantId]?.dept_id) : ""}
          onlyEnabled
          invalid={!!fieldErrors.dept}
          onChange={(value) => onSetTenantDept(currentTenantId, Number(value))}
        />
      )}
    </FormField>
  );
}
