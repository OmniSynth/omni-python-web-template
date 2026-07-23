import { useTimezone } from "@/contexts/TimezoneContext";
import { useManagementScope } from "@/lib/management-scope";
import { useUsersPageActions } from "./use-users-page-actions";
import {
  collectUserBindings,
  currentTenantDeptId as resolveTenantDeptId,
  currentTenantScopePayload as resolveTenantScopePayload,
  validateUserDeptRequired,
} from "./use-users-page-bindings";
import type { useUsersPageLoadAndForm } from "./use-users-page-load-form";
import type { useUsersPageState } from "./use-users-page-state";
import { useUsersPageTable } from "./use-users-page-table";
import { useUsersTenantDraft } from "./use-users-tenant-draft";

export function useUsersPageInteractions(
  state: ReturnType<typeof useUsersPageState>,
  ctx: ReturnType<typeof useUsersPageLoadAndForm>,
) {
  const { formatDateTime } = useTimezone();
  const tenantScope = useManagementScope() === "tenant";
  const userPerm = (system: string, tenant: string) => (tenantScope ? tenant : system);

  const actions = useUsersPageActions({
    tenantScope: ctx.tenantScope,
    clearFieldErrors: state.clearFieldErrors,
    setSectionError: state.setSectionError,
    collectBindings: () => collectUserBindings(state.tenantDraft),
    validateDeptRequired: () =>
      validateUserDeptRequired({
        tenantScope: ctx.tenantScope,
        currentTenantId: ctx.current?.tenant_id,
        tenantDraft: state.tenantDraft,
      }),
    sheetMode: state.sheetMode,
    username: state.username,
    displayName: state.displayName,
    setFieldErrors: state.setFieldErrors,
    setSaving: state.setSaving,
    roleIds: state.roleIds,
    currentTenantDeptId: () => resolveTenantDeptId(ctx.current?.tenant_id, state.tenantDraft),
    currentTenantScopePayload: () => resolveTenantScopePayload(ctx.current?.tenant_id, state.tenantDraft),
    setSheetOpen: state.setSheetOpen,
    resetForm: ctx.form.resetForm,
    setPasswordReveal: state.setPasswordReveal,
    load: ctx.load,
    editing: state.editing,
    enabled: state.enabled,
    currentId: ctx.current?.id,
    setEditing: state.setEditing,
    setResettingId: state.setResettingId,
    offboardTarget: state.offboardTarget,
    setOffboardTarget: state.setOffboardTarget,
    setOffboarding: state.setOffboarding,
    passwordReveal: state.passwordReveal,
    credentialsCopyText: state.credentialsCopyText,
    passwordInputRef: state.passwordInputRef,
    setCopyHint: state.setCopyHint,
  });

  const tenantDraftActions = useUsersTenantDraft({
    setSectionError: state.setSectionError,
    setTenantDraft: state.setTenantDraft,
    clearFieldError: state.clearFieldError,
    ensureDeptOptions: ctx.dept.ensureDeptOptions,
    deptCache: state.deptCache,
  });

  const table = useUsersPageTable({
    formatDateTime,
    tenantScope: ctx.tenantScope,
    currentId: ctx.current?.id,
    userPerm,
    openEdit: ctx.form.openEdit,
    resettingId: state.resettingId,
    toggleEnabled: actions.toggleEnabled,
    handleResetPassword: actions.handleResetPassword,
    setOffboardTarget: state.setOffboardTarget,
    users: state.users,
  });

  return { userPerm, actions, tenantDraftActions, table };
}
