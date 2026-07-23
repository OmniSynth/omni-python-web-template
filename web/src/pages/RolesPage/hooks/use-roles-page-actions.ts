import type { Dispatch, SetStateAction } from "react";
import { mergeAssignSelection } from "@/components/permission-assign";
import { api } from "@/lib/api";
import { customScopesFromDeptIds, validateDataScopeSelection } from "@/lib/data-scope";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import { permissionTreeForRoleType } from "@/lib/permission-tree-for-role";
import { expandPermissionCodes } from "@/lib/permissions";
import { validateRoleCode, validateRoleName } from "@/lib/role-code";
import type { PermissionInfo, RoleRecord } from "@/types/auth";

export function useRolesPageActions({
  tenantScope,
  editing,
  code,
  name,
  description,
  createDataScope,
  createSelectedDeptIds,
  createSelectedMenus,
  createSelectedButtons,
  createRoleType,
  dataScope,
  selectedDeptIds,
  selectedMenus,
  selectedButtons,
  systemPermissions,
  tenantPermissions,
  clearFieldErrors,
  setFieldErrors,
  setDataScopeError,
  setCreateOpen,
  setFuncPermOpen,
  setDataScopeOpen,
  setEditing,
  resetCreateForm,
  load,
}: {
  tenantScope: boolean;
  editing: RoleRecord | null;
  code: string;
  name: string;
  description: string;
  createDataScope: number;
  createSelectedDeptIds: Set<number>;
  createSelectedMenus: string[];
  createSelectedButtons: string[];
  createRoleType: "system" | "tenant";
  dataScope: number;
  selectedDeptIds: Set<number>;
  selectedMenus: string[];
  selectedButtons: string[];
  systemPermissions: PermissionInfo[];
  tenantPermissions: PermissionInfo[];
  clearFieldErrors: () => void;
  setFieldErrors: (errors: Record<string, string>) => void;
  setDataScopeError: Dispatch<SetStateAction<string>>;
  setCreateOpen: Dispatch<SetStateAction<boolean>>;
  setFuncPermOpen: Dispatch<SetStateAction<boolean>>;
  setDataScopeOpen: Dispatch<SetStateAction<boolean>>;
  setEditing: Dispatch<SetStateAction<RoleRecord | null>>;
  resetCreateForm: () => void;
  load: () => Promise<void>;
}) {
  async function persistRoleDataScope(roleId: number, scope: number, deptIds: Set<number>) {
    const customScopes = scope === 4 ? customScopesFromDeptIds(deptIds) : [];
    if (tenantScope) {
      await api.tenantRoles.update(roleId, {
        data_scope: scope,
        custom_scopes: customScopes,
      });
    } else {
      await api.roles.update(roleId, {
        data_scope: scope,
        custom_scopes: customScopes,
      });
    }
  }

  async function handleCreate() {
    clearFieldErrors();
    setDataScopeError("");
    const errors: Record<string, string> = {};
    const codeError = validateRoleCode(code);
    if (codeError) errors.code = codeError;
    const nameError = validateRoleName(name);
    if (nameError) errors.name = nameError;
    const scopeError = validateDataScopeSelection(createDataScope, createSelectedDeptIds);
    if (scopeError) setDataScopeError(scopeError);
    if (Object.keys(errors).length > 0 || scopeError) {
      setFieldErrors(errors);
      return;
    }
    try {
      const body = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        data_scope: createDataScope,
        ...(tenantScope ? {} : { role_type: createRoleType }),
      };
      const created = tenantScope ? await api.tenantRoles.create(body) : await api.roles.create(body);
      if (createDataScope === 4) {
        await persistRoleDataScope(created.id, createDataScope, createSelectedDeptIds);
      }
      const createPermissions = permissionTreeForRoleType(
        tenantScope ? "tenant" : createRoleType,
        systemPermissions,
        tenantPermissions,
      );
      const merged = mergeAssignSelection(createSelectedMenus, createSelectedButtons);
      if (merged.length > 0) {
        const expanded = expandPermissionCodes(merged, createPermissions);
        if (tenantScope) {
          await api.tenantRoles.setPermissions(created.id, expanded);
        } else {
          await api.roles.setPermissions(created.id, expanded);
        }
      }
      setCreateOpen(false);
      resetCreateForm();
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "创建失败"));
    }
  }

  async function handleSaveFunctionalPermissions() {
    if (!editing || editing.system_managed) return;
    try {
      const editPermissions = permissionTreeForRoleType(
        tenantScope ? "tenant" : editing.role_type,
        systemPermissions,
        tenantPermissions,
      );
      const merged = mergeAssignSelection(selectedMenus, selectedButtons);
      const expanded = expandPermissionCodes(merged, editPermissions);
      if (tenantScope) {
        await api.tenantRoles.setPermissions(editing.id, expanded);
      } else {
        await api.roles.setPermissions(editing.id, expanded);
      }
      setFuncPermOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    }
  }

  async function handleSaveDataScope() {
    if (!editing || editing.system_managed) return;
    const scopeError = validateDataScopeSelection(dataScope, selectedDeptIds);
    if (scopeError) {
      setDataScopeError(scopeError);
      return;
    }
    try {
      await persistRoleDataScope(editing.id, dataScope, selectedDeptIds);
      setDataScopeOpen(false);
      setEditing(null);
      setDataScopeError("");
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    }
  }

  return { handleCreate, handleSaveFunctionalPermissions, handleSaveDataScope };
}
