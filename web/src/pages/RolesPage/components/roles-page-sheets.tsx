import type { useRolesPage } from "../hooks/use-roles-page";
import { RoleCreateSheet } from "./role-create-sheet";
import { RoleDataScopeSheet } from "./role-data-scope-sheet";
import { RoleFunctionalPermissionsSheet } from "./role-functional-permissions-sheet";

type RolesPageState = ReturnType<typeof useRolesPage>;

export function RolesPageSheets({ page }: { page: RolesPageState }) {
  return (
    <>
      <RoleCreateSheet
        open={page.createOpen}
        onOpenChange={(open) => {
          page.setCreateOpen(open);
          if (!open) {
            page.clearFieldErrors();
            page.setDataScopeError("");
          }
        }}
        tenantScope={page.tenantScope}
        code={page.code}
        name={page.name}
        description={page.description}
        createRoleType={page.createRoleType}
        permissions={page.createPermissions}
        createSelectedMenus={page.createSelectedMenus}
        createSelectedButtons={page.createSelectedButtons}
        createDataScope={page.createDataScope}
        createSelectedDeptIds={page.createSelectedDeptIds}
        createDeptTree={page.createDeptTree}
        fieldErrors={page.fieldErrors}
        dataScopeError={page.dataScopeError}
        onCodeChange={page.setCode}
        onNameChange={page.setName}
        onDescriptionChange={page.setDescription}
        onCreateRoleTypeChange={(value) => {
          page.setCreateRoleType(value);
          page.setCreateSelectedMenus([]);
          page.setCreateSelectedButtons([]);
        }}
        onCreateMenusChange={page.setCreateSelectedMenus}
        onCreateButtonsChange={page.setCreateSelectedButtons}
        onCreateDataScopeChange={page.setCreateDataScope}
        onToggleCreateDeptScope={page.toggleCreateDeptScope}
        onClearFieldError={page.clearFieldError}
        onCreate={page.handleCreate}
      />

      <RoleFunctionalPermissionsSheet
        open={page.funcPermOpen}
        onOpenChange={(open) => {
          page.setFuncPermOpen(open);
          if (!open) page.setEditing(null);
        }}
        editing={page.editing}
        permissions={page.editPermissions}
        selectedMenus={page.selectedMenus}
        selectedButtons={page.selectedButtons}
        onMenusChange={page.setSelectedMenus}
        onButtonsChange={page.setSelectedButtons}
        onSave={page.handleSaveFunctionalPermissions}
      />

      <RoleDataScopeSheet
        open={page.dataScopeOpen}
        onOpenChange={(open) => {
          page.setDataScopeOpen(open);
          if (!open) {
            page.setEditing(null);
            page.setDataScopeError("");
          }
        }}
        editing={page.editing}
        dataScope={page.dataScope}
        selectedDeptIds={page.selectedDeptIds}
        deptTree={page.deptTree}
        dataScopeError={page.dataScopeError}
        onDataScopeChange={page.setDataScope}
        onToggleDeptScope={page.toggleDeptScope}
        onSave={page.handleSaveDataScope}
      />
    </>
  );
}
