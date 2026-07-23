import { useRolesPageActions } from "./use-roles-page-actions";
import { useRolesPageForm } from "./use-roles-page-form";
import { buildRolesPageReturn } from "./use-roles-page-return";
import { useRolesPageState } from "./use-roles-page-state";
import { useRolesPageTable } from "./use-roles-page-table";

export function useRolesPage() {
  const state = useRolesPageState();
  const form = useRolesPageForm({
    tenantScope: state.tenantScope,
    systemPermissions: state.systemPermissions,
    tenantPermissions: state.tenantPermissions,
    clearFieldErrors: state.clearFieldErrors,
    setCreateDeptTree: state.setCreateDeptTree,
    setCreateOpen: state.setCreateOpen,
    resetCreateForm: state.resetCreateForm,
    setEditing: state.setEditing,
    setSelectedMenus: state.setSelectedMenus,
    setSelectedButtons: state.setSelectedButtons,
    setFuncPermOpen: state.setFuncPermOpen,
    setDataScope: state.setDataScope,
    setSelectedDeptIds: state.setSelectedDeptIds,
    setDataScopeError: state.setDataScopeError,
    setDeptTree: state.setDeptTree,
    setDataScopeOpen: state.setDataScopeOpen,
  });

  const actions = useRolesPageActions({
    tenantScope: state.tenantScope,
    editing: state.editing,
    code: state.code,
    name: state.name,
    description: state.description,
    createDataScope: state.createDataScope,
    createSelectedDeptIds: state.createSelectedDeptIds,
    createSelectedMenus: state.createSelectedMenus,
    createSelectedButtons: state.createSelectedButtons,
    createRoleType: state.createRoleType,
    dataScope: state.dataScope,
    selectedDeptIds: state.selectedDeptIds,
    selectedMenus: state.selectedMenus,
    selectedButtons: state.selectedButtons,
    systemPermissions: state.systemPermissions,
    tenantPermissions: state.tenantPermissions,
    clearFieldErrors: state.clearFieldErrors,
    setFieldErrors: state.setFieldErrors,
    setDataScopeError: state.setDataScopeError,
    setCreateOpen: state.setCreateOpen,
    setFuncPermOpen: state.setFuncPermOpen,
    setDataScopeOpen: state.setDataScopeOpen,
    setEditing: state.setEditing,
    resetCreateForm: state.resetCreateForm,
    load: state.load,
  });

  const { roleColumns, roleTable } = useRolesPageTable({
    tenantScope: state.tenantScope,
    systemPermissions: state.systemPermissions,
    tenantPermissions: state.tenantPermissions,
    rolePerm: state.rolePerm,
    roles: state.roles,
    onOpenFunctionalPermissions: form.openFunctionalPermissions,
    onOpenDataScope: form.openDataScope,
  });

  return buildRolesPageReturn({ state, form, actions, roleColumns, roleTable });
}
