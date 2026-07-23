import { useUsersPageCore } from "./use-users-page-core";
import { useUsersPageState } from "./use-users-page-state";
import { buildUsersPageViewModel } from "./use-users-page-view-model";

export function useUsersPage() {
  const state = useUsersPageState();
  const core = useUsersPageCore(state);

  return buildUsersPageViewModel({
    tenantScope: core.tenantScope,
    userPerm: core.userPerm,
    current: core.current,
    state,
    actions: core.actions,
    tenantDraftActions: core.tenantDraftActions,
    userTable: core.table.userTable,
    userColumns: core.table.userColumns,
    openCreate: core.form.openCreate,
    onSheetOpenChange: (open) => core.form.handleSheetOpenChange(open, state.setSheetOpen),
  });
}
