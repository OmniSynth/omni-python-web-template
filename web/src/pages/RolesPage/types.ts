import type { DeptRecord, PermissionInfo, RoleRecord } from "@/types/auth";

export interface RoleCreatePermissionFields {
  permissions: PermissionInfo[];
  createSelectedMenus: string[];
  createSelectedButtons: string[];
  onCreateMenusChange: (menus: string[]) => void;
  onCreateButtonsChange: (buttons: string[]) => void;
}

export type RolePermResolver = (system: string, tenant: string) => string;

export interface RoleCreateSheetProps extends RoleCreatePermissionFields {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantScope: boolean;
  code: string;
  name: string;
  description: string;
  createRoleType: "system" | "tenant";
  createDataScope: number;
  createSelectedDeptIds: Set<number>;
  createDeptTree: DeptRecord[];
  fieldErrors: Record<string, string>;
  dataScopeError: string;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCreateRoleTypeChange: (value: "system" | "tenant") => void;
  onCreateDataScopeChange: (scope: number) => void;
  onToggleCreateDeptScope: (id: number, checked: boolean) => void;
  onClearFieldError: (field: string) => void;
  onCreate: () => void;
}

export interface RoleFunctionalPermissionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RoleRecord | null;
  permissions: PermissionInfo[];
  selectedMenus: string[];
  selectedButtons: string[];
  onMenusChange: (menus: string[]) => void;
  onButtonsChange: (buttons: string[]) => void;
  onSave: () => void;
}

export interface RoleDataScopeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RoleRecord | null;
  dataScope: number;
  selectedDeptIds: Set<number>;
  deptTree: DeptRecord[];
  dataScopeError: string;
  onDataScopeChange: (scope: number) => void;
  onToggleDeptScope: (id: number, checked: boolean) => void;
  onSave: () => void;
}
