import { useUsersPageInteractions } from "./use-users-page-interactions";
import { useUsersPageLoadAndForm } from "./use-users-page-load-form";
import type { useUsersPageState } from "./use-users-page-state";

export function useUsersPageCore(state: ReturnType<typeof useUsersPageState>) {
  const ctx = useUsersPageLoadAndForm(state);
  const interactions = useUsersPageInteractions(state, ctx);

  return {
    tenantScope: ctx.tenantScope,
    userPerm: interactions.userPerm,
    current: ctx.current,
    actions: interactions.actions,
    tenantDraftActions: interactions.tenantDraftActions,
    form: ctx.form,
    table: interactions.table,
  };
}
