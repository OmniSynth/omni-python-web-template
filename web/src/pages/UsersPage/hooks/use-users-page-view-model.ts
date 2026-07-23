import type { UserRecord } from "@/types/auth";
import type { useUsersPageActions } from "./use-users-page-actions";
import type { useUsersPageState } from "./use-users-page-state";
import type { useUsersTenantDraft } from "./use-users-tenant-draft";

type UsersState = ReturnType<typeof useUsersPageState>;
type UsersActions = ReturnType<typeof useUsersPageActions>;
type TenantDraftActions = ReturnType<typeof useUsersTenantDraft>;
type UsersTable = ReturnType<typeof import("@/hooks/useClientTable").useClientTable<UserRecord>>;
type UsersColumns = ReturnType<typeof import("./use-user-columns").useUserColumns>;

export function buildUsersPageViewModel({
  tenantScope,
  userPerm,
  current,
  state,
  actions,
  tenantDraftActions,
  userTable,
  userColumns,
  openCreate,
  onSheetOpenChange,
}: {
  tenantScope: boolean;
  userPerm: (system: string, tenant: string) => string;
  current: ReturnType<typeof import("@/contexts/AuthContext").useAuth>["user"];
  state: UsersState;
  actions: UsersActions;
  tenantDraftActions: TenantDraftActions;
  userTable: UsersTable;
  userColumns: UsersColumns;
  openCreate: () => Promise<void>;
  onSheetOpenChange: (open: boolean) => void;
}) {
  return {
    tenantScope,
    userPerm,
    pageLoadError: state.pageLoadError,
    userTable,
    userColumns,
    openCreate,
    sheetOpen: state.sheetOpen,
    handleSheetOpenChange: onSheetOpenChange,
    sheetMode: state.sheetMode,
    hideDisplayNameOnEdit: tenantScope && state.sheetMode === "edit",
    formId: state.sheetMode === "create" ? "create-user-form" : "edit-user-form",
    fieldErrors: state.fieldErrors,
    sectionError: state.sectionError,
    username: state.username,
    setUsername: state.setUsername,
    editing: state.editing,
    displayName: state.displayName,
    setDisplayName: state.setDisplayName,
    enabled: state.enabled,
    setEnabled: state.setEnabled,
    editingSelf: state.editing?.id === current?.id,
    roles: state.roles,
    roleIds: state.roleIds,
    setRoleIds: state.setRoleIds,
    current,
    tenantConfigs: state.tenantConfigs,
    tenantDraft: state.tenantDraft,
    deptCache: state.deptCache,
    ...tenantDraftActions,
    clearFieldError: state.clearFieldError,
    saving: state.saving,
    handleSubmit: actions.handleSubmit,
    passwordReveal: state.passwordReveal,
    credentialsCopyText: state.credentialsCopyText,
    copyHint: state.copyHint,
    passwordInputRef: state.passwordInputRef,
    closePasswordReveal: actions.closePasswordReveal,
    copyPassword: actions.copyPassword,
    offboardTarget: state.offboardTarget,
    setOffboardTarget: state.setOffboardTarget,
    offboarding: state.offboarding,
    handleOffboard: actions.handleOffboard,
  };
}
