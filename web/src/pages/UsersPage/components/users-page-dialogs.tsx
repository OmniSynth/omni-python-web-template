import type { useUsersPage } from "../hooks/use-users-page";
import { OffboardAlertDialog } from "./offboard-alert-dialog";
import { PasswordRevealDialog } from "./password-reveal-dialog";
import { UserFormSheet } from "./user-form-sheet";

type UsersPageState = ReturnType<typeof useUsersPage>;

export function UsersPageDialogs({ page }: { page: UsersPageState }) {
  return (
    <>
      <UserFormSheet
        sheetOpen={page.sheetOpen}
        onSheetOpenChange={page.handleSheetOpenChange}
        sheetMode={page.sheetMode}
        hideDisplayNameOnEdit={page.hideDisplayNameOnEdit}
        formId={page.formId}
        fieldErrors={page.fieldErrors}
        sectionError={page.sectionError}
        username={page.username}
        onUsernameChange={page.setUsername}
        editing={page.editing}
        displayName={page.displayName}
        onDisplayNameChange={page.setDisplayName}
        enabled={page.enabled}
        onEnabledChange={page.setEnabled}
        editingSelf={page.editingSelf}
        roles={page.roles}
        roleIds={page.roleIds}
        onRoleIdsChange={page.setRoleIds}
        tenantScope={page.tenantScope}
        currentTenantId={page.current?.tenant_id}
        tenantConfigs={page.tenantConfigs}
        tenantDraft={page.tenantDraft}
        deptCache={page.deptCache}
        onToggleTenantBound={page.toggleTenantBound}
        onSetTenantDept={page.setTenantDept}
        onSetTenantDataScope={page.setTenantDataScope}
        onToggleTenantCustomDeptScope={page.toggleTenantCustomDeptScope}
        clearFieldError={page.clearFieldError}
        saving={page.saving}
        onSubmit={page.handleSubmit}
      />

      <PasswordRevealDialog
        passwordReveal={page.passwordReveal}
        credentialsCopyText={page.credentialsCopyText}
        copyHint={page.copyHint}
        passwordInputRef={page.passwordInputRef}
        onClose={page.closePasswordReveal}
        onCopy={page.copyPassword}
      />

      {page.tenantScope ? (
        <OffboardAlertDialog
          offboardTarget={page.offboardTarget}
          offboarding={page.offboarding}
          onOpenChange={(open) => {
            if (!open) page.setOffboardTarget(null);
          }}
          onConfirm={page.handleOffboard}
        />
      ) : null}
    </>
  );
}
