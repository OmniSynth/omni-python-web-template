import { DataScopeFields } from "@/components/dept/data-scope-fields";
import { FormField } from "@/components/form/form-field";
import { PermissionAssignPanel } from "@/components/permission-assign";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { sanitizeRoleCodeInput } from "@/lib/role-code";
import { ROLE_TYPE_LABELS } from "@/lib/role-type";
import type { RoleCreateSheetProps } from "../types";

export function RoleCreateSheet({
  open,
  onOpenChange,
  tenantScope,
  code,
  name,
  description,
  createRoleType,
  permissions,
  createSelectedMenus,
  createSelectedButtons,
  createDataScope,
  createSelectedDeptIds,
  createDeptTree,
  fieldErrors,
  dataScopeError,
  onCodeChange,
  onNameChange,
  onDescriptionChange,
  onCreateRoleTypeChange,
  onCreateMenusChange,
  onCreateButtonsChange,
  onCreateDataScopeChange,
  onToggleCreateDeptScope,
  onClearFieldError,
  onCreate,
}: RoleCreateSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>新建角色</SheetTitle>
          <SheetDescription>填写基本信息、菜单权限与默认数据权限范围</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-4">
            <FormField label="编码" htmlFor="role-code" required error={fieldErrors.code}>
              <Input
                id="role-code"
                value={code}
                pattern="[a-zA-Z0-9_-]+"
                autoComplete="off"
                aria-invalid={!!fieldErrors.code}
                onChange={(event) => {
                  onCodeChange(sanitizeRoleCodeInput(event.target.value));
                  onClearFieldError("code");
                }}
              />
              <p className="text-xs text-muted-foreground">仅允许字母、数字、连字符（-）与下划线（_）</p>
            </FormField>
            <FormField label="名称" htmlFor="role-name" required error={fieldErrors.name}>
              <Input
                id="role-name"
                value={name}
                aria-invalid={!!fieldErrors.name}
                onChange={(event) => {
                  onNameChange(event.target.value);
                  onClearFieldError("name");
                }}
              />
            </FormField>
            <FormField label="描述" htmlFor="role-desc">
              <Input id="role-desc" value={description} onChange={(event) => onDescriptionChange(event.target.value)} />
            </FormField>
            {!tenantScope ? (
              <FormField label="类型" htmlFor="role-type" required>
                <Select
                  value={createRoleType}
                  onValueChange={(value) => onCreateRoleTypeChange(value as "system" | "tenant")}
                >
                  <SelectTrigger id="role-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">{ROLE_TYPE_LABELS.tenant}</SelectItem>
                    <SelectItem value="system">{ROLE_TYPE_LABELS.system}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">租户类型角色可绑定到机构/租户；系统类型仅用于平台用户</p>
              </FormField>
            ) : null}
            <PermissionAssignPanel
              tree={permissions}
              selectedMenus={createSelectedMenus}
              selectedButtons={createSelectedButtons}
              onMenusChange={onCreateMenusChange}
              onButtonsChange={onCreateButtonsChange}
            />
            <DataScopeFields
              dataScope={createDataScope}
              selectedDeptIds={createSelectedDeptIds}
              deptTree={createDeptTree}
              onDataScopeChange={onCreateDataScopeChange}
              onToggleDeptScope={onToggleCreateDeptScope}
            />
            {dataScopeError ? <p className="text-xs text-destructive">{dataScopeError}</p> : null}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={() => void onCreate()}>
            创建
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
