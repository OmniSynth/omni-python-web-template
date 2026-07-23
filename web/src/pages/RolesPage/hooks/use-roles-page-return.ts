import { permissionTreeForRoleType } from "@/lib/permission-tree-for-role";
import type { useRolesPageActions } from "./use-roles-page-actions";
import type { useRolesPageForm } from "./use-roles-page-form";
import type { useRolesPageState } from "./use-roles-page-state";
import type { useRolesPageTable } from "./use-roles-page-table";

export function buildRolesPageReturn({
  state,
  form,
  actions,
  roleColumns,
  roleTable,
}: {
  state: ReturnType<typeof useRolesPageState>;
  form: ReturnType<typeof useRolesPageForm>;
  actions: ReturnType<typeof useRolesPageActions>;
  roleColumns: ReturnType<typeof useRolesPageTable>["roleColumns"];
  roleTable: ReturnType<typeof useRolesPageTable>["roleTable"];
}) {
  return {
    rolePerm: state.rolePerm,
    pageLoadError: state.pageLoadError,
    roleColumns,
    roleTable,
    createOpen: state.createOpen,
    setCreateOpen: state.setCreateOpen,
    funcPermOpen: state.funcPermOpen,
    setFuncPermOpen: state.setFuncPermOpen,
    dataScopeOpen: state.dataScopeOpen,
    setDataScopeOpen: state.setDataScopeOpen,
    editing: state.editing,
    setEditing: state.setEditing,
    code: state.code,
    setCode: state.setCode,
    name: state.name,
    setName: state.setName,
    description: state.description,
    setDescription: state.setDescription,
    selectedMenus: state.selectedMenus,
    setSelectedMenus: state.setSelectedMenus,
    selectedButtons: state.selectedButtons,
    setSelectedButtons: state.setSelectedButtons,
    tenantScope: state.tenantScope,
    createRoleType: state.createRoleType,
    setCreateRoleType: state.setCreateRoleType,
    createSelectedMenus: state.createSelectedMenus,
    setCreateSelectedMenus: state.setCreateSelectedMenus,
    createSelectedButtons: state.createSelectedButtons,
    setCreateSelectedButtons: state.setCreateSelectedButtons,
    createDataScope: state.createDataScope,
    setCreateDataScope: state.setCreateDataScope,
    createSelectedDeptIds: state.createSelectedDeptIds,
    createDeptTree: state.createDeptTree,
    dataScope: state.dataScope,
    setDataScope: state.setDataScope,
    deptTree: state.deptTree,
    selectedDeptIds: state.selectedDeptIds,
    dataScopeError: state.dataScopeError,
    setDataScopeError: state.setDataScopeError,
    createPermissions: permissionTreeForRoleType(
      state.tenantScope ? "tenant" : state.createRoleType,
      state.systemPermissions,
      state.tenantPermissions,
    ),
    editPermissions: permissionTreeForRoleType(
      state.tenantScope ? "tenant" : state.editing?.role_type,
      state.systemPermissions,
      state.tenantPermissions,
    ),
    fieldErrors: state.fieldErrors,
    clearFieldErrors: state.clearFieldErrors,
    clearFieldError: state.clearFieldError,
    openCreate: form.openCreate,
    toggleCreateDeptScope: (id: number, checked: boolean) =>
      form.toggleCreateDeptScope(state.setCreateSelectedDeptIds, state.createDeptTree, id, checked),
    toggleDeptScope: (id: number, checked: boolean) =>
      form.toggleCreateDeptScope(state.setSelectedDeptIds, state.deptTree, id, checked),
    handleCreate: actions.handleCreate,
    handleSaveFunctionalPermissions: actions.handleSaveFunctionalPermissions,
    handleSaveDataScope: actions.handleSaveDataScope,
  };
}
