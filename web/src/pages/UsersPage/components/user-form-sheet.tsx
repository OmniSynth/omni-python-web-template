import type { SubmitEvent } from "react";
import { DataScopeFields } from "@/components/dept/data-scope-fields";
import { FormField } from "@/components/form/form-field";
import { FormSectionError } from "@/components/form/form-section-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_DATA_SCOPE } from "@/lib/data-scope";
import type { DeptRecord, RoleRecord, UserRecord, UserTenantConfigItem } from "@/types/auth";
import type { SheetMode, TenantDraft } from "../types";
import { RoleCheckboxes } from "./role-checkboxes";
import { UserTenantConfigSection, UserTenantScopeDeptField } from "./user-tenant-config-section";

export function UserFormSheet({
  sheetOpen,
  onSheetOpenChange,
  sheetMode,
  hideDisplayNameOnEdit,
  formId,
  fieldErrors,
  sectionError,
  username,
  onUsernameChange,
  editing,
  displayName,
  onDisplayNameChange,
  enabled,
  onEnabledChange,
  editingSelf,
  roles,
  roleIds,
  onRoleIdsChange,
  tenantScope,
  currentTenantId,
  tenantConfigs,
  tenantDraft,
  deptCache,
  onToggleTenantBound,
  onSetTenantDept,
  onSetTenantDataScope,
  onToggleTenantCustomDeptScope,
  clearFieldError,
  saving,
  onSubmit,
}: {
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  sheetMode: SheetMode;
  hideDisplayNameOnEdit: boolean;
  formId: string;
  fieldErrors: Record<string, string>;
  sectionError: string;
  username: string;
  onUsernameChange: (value: string) => void;
  editing: UserRecord | null;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  editingSelf: boolean;
  roles: RoleRecord[];
  roleIds: number[];
  onRoleIdsChange: (ids: number[]) => void;
  tenantScope: boolean;
  currentTenantId: number | null | undefined;
  tenantConfigs: UserTenantConfigItem[];
  tenantDraft: Record<number, TenantDraft>;
  deptCache: Record<number, DeptRecord[]>;
  onToggleTenantBound: (tenantId: number, bound: boolean) => void;
  onSetTenantDept: (tenantId: number, deptIdValue: number | null) => void;
  onSetTenantDataScope: (tenantId: number, dataScope: number) => void;
  onToggleTenantCustomDeptScope: (tenantId: number, deptId: number, checked: boolean) => void;
  clearFieldError: (field: string) => void;
  saving: boolean;
  onSubmit: (e: SubmitEvent) => void;
}) {
  const showDisplayNameField = sheetMode === "create" || !hideDisplayNameOnEdit;

  return (
    <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{sheetMode === "create" ? "新建用户" : "编辑用户"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form id={formId} className="grid gap-4" onSubmit={onSubmit}>
            {sheetMode === "create" ? (
              <FormField label="用户名" htmlFor="user-username" required error={fieldErrors.username}>
                <Input
                  id="user-username"
                  value={username}
                  aria-invalid={!!fieldErrors.username}
                  onChange={(e) => {
                    onUsernameChange(e.target.value);
                    clearFieldError("username");
                  }}
                />
              </FormField>
            ) : (
              <div className="grid gap-2">
                <Label>用户名</Label>
                <Input value={editing?.username ?? ""} disabled />
              </div>
            )}
            {showDisplayNameField ? (
              <FormField
                label="显示名"
                htmlFor="user-display"
                required={sheetMode === "create"}
                error={fieldErrors.displayName}
              >
                <Input
                  id="user-display"
                  value={displayName}
                  aria-invalid={!!fieldErrors.displayName}
                  onChange={(e) => {
                    onDisplayNameChange(e.target.value);
                    clearFieldError("displayName");
                  }}
                />
              </FormField>
            ) : (
              <div className="grid gap-2">
                <Label>显示名</Label>
                <Input value={editing?.display_name ?? ""} disabled />
                <p className="text-xs text-muted-foreground">显示名由用户在个人中心自行修改。</p>
              </div>
            )}
            {sheetMode === "edit" ? (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="user-enabled">启用</Label>
                <Switch id="user-enabled" checked={enabled} disabled={editingSelf} onCheckedChange={onEnabledChange} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                保存后将随机生成登录密码，并在弹窗中展示一次，请立即复制保存。
              </p>
            )}
            <div className="grid gap-2">
              <Label>角色（当前租户）</Label>
              <RoleCheckboxes roles={roles} selected={roleIds} onChange={onRoleIdsChange} />
            </div>
            {!tenantScope ? (
              <UserTenantConfigSection
                sheetMode={sheetMode}
                editingSelf={editingSelf}
                tenantConfigs={tenantConfigs}
                tenantDraft={tenantDraft}
                deptCache={deptCache}
                onToggleTenantBound={onToggleTenantBound}
                onSetTenantDept={onSetTenantDept}
                onSetTenantDataScope={onSetTenantDataScope}
                onToggleTenantCustomDeptScope={onToggleTenantCustomDeptScope}
                sectionError={sectionError}
              />
            ) : currentTenantId != null ? (
              <UserTenantScopeDeptField
                currentTenantId={currentTenantId}
                tenantDraft={tenantDraft}
                deptCache={deptCache}
                fieldErrors={fieldErrors}
                onSetTenantDept={onSetTenantDept}
              />
            ) : null}
            {tenantScope && currentTenantId != null ? (
              <DataScopeFields
                dataScope={tenantDraft[currentTenantId]?.data_scope ?? DEFAULT_DATA_SCOPE}
                selectedDeptIds={new Set(tenantDraft[currentTenantId]?.custom_scope_dept_ids ?? [])}
                deptTree={deptCache[currentTenantId] ?? []}
                onDataScopeChange={(value) => onSetTenantDataScope(currentTenantId, value)}
                onToggleDeptScope={(deptId, checked) => onToggleTenantCustomDeptScope(currentTenantId, deptId, checked)}
              />
            ) : null}
            <FormSectionError>{sectionError}</FormSectionError>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button variant="secondary" type="button" onClick={() => onSheetOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {sheetMode === "create" ? "创建" : "保存"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
