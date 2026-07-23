import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_DATA_SCOPE, deptIdsFromScopes, loadDeptTreeForScope, toggleDeptScopeCascade } from "@/lib/data-scope";
import { permissionTreeForRoleType } from "@/lib/permission-tree-for-role";
import { resolveAssignmentSelection } from "@/lib/permissions";
import type { DeptRecord, PermissionInfo, RoleRecord } from "@/types/auth";

export function useRolesPageForm({
  tenantScope,
  systemPermissions,
  tenantPermissions,
  clearFieldErrors,
  setCreateDeptTree,
  setCreateOpen,
  resetCreateForm,
  setEditing,
  setSelectedMenus,
  setSelectedButtons,
  setFuncPermOpen,
  setDataScope,
  setSelectedDeptIds,
  setDataScopeError,
  setDeptTree,
  setDataScopeOpen,
}: {
  tenantScope: boolean;
  systemPermissions: PermissionInfo[];
  tenantPermissions: PermissionInfo[];
  clearFieldErrors: () => void;
  setCreateDeptTree: Dispatch<SetStateAction<DeptRecord[]>>;
  setCreateOpen: Dispatch<SetStateAction<boolean>>;
  resetCreateForm: () => void;
  setEditing: Dispatch<SetStateAction<RoleRecord | null>>;
  setSelectedMenus: Dispatch<SetStateAction<string[]>>;
  setSelectedButtons: Dispatch<SetStateAction<string[]>>;
  setFuncPermOpen: Dispatch<SetStateAction<boolean>>;
  setDataScope: Dispatch<SetStateAction<number>>;
  setSelectedDeptIds: Dispatch<SetStateAction<Set<number>>>;
  setDataScopeError: Dispatch<SetStateAction<string>>;
  setDeptTree: Dispatch<SetStateAction<DeptRecord[]>>;
  setDataScopeOpen: Dispatch<SetStateAction<boolean>>;
}) {
  function openCreate() {
    clearFieldErrors();
    resetCreateForm();
    void loadDeptTreeForScope({ tenantScope }).then(setCreateDeptTree);
    setCreateOpen(true);
  }

  function openFunctionalPermissions(role: RoleRecord) {
    setEditing(role);
    const tree = permissionTreeForRoleType(
      tenantScope ? "tenant" : role.role_type,
      systemPermissions,
      tenantPermissions,
    );
    const { menus, buttons } = resolveAssignmentSelection(role.permissions, tree);
    setSelectedMenus(menus);
    setSelectedButtons(buttons);
    setFuncPermOpen(true);
  }

  function openDataScope(role: RoleRecord) {
    setEditing(role);
    setDataScope(role.data_scope ?? DEFAULT_DATA_SCOPE);
    setSelectedDeptIds(deptIdsFromScopes(role.custom_scopes));
    setDataScopeError("");
    void loadDeptTreeForScope({ tenantScope }).then(setDeptTree);
    setDataScopeOpen(true);
  }

  function toggleCreateDeptScope(
    setter: Dispatch<SetStateAction<Set<number>>>,
    deptTree: DeptRecord[],
    id: number,
    checked: boolean,
  ) {
    setter((prev) => toggleDeptScopeCascade(prev, id, checked, deptTree));
    setDataScopeError("");
  }

  return { openCreate, openFunctionalPermissions, openDataScope, toggleCreateDeptScope };
}
