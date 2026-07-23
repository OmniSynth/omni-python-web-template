import { useTenantsPageActions } from "./use-tenants-page-actions";
import { useTenantsPageForm } from "./use-tenants-page-form";
import { buildTenantsPageReturn } from "./use-tenants-page-return";
import { useTenantsPageState } from "./use-tenants-page-state";
import { useTenantsPageTable } from "./use-tenants-page-table";

export function useTenantsPage() {
  const state = useTenantsPageState();
  const form = useTenantsPageForm({
    orgs: state.orgs,
    clearFieldErrors: state.clearFieldErrors,
    setSectionError: state.setSectionError,
    setEditing: state.setEditing,
    setName: state.setName,
    setPhone: state.setPhone,
    setLocation: state.setLocation,
    setOrgId: state.setOrgId,
    setSystemRoleCodes: state.setSystemRoleCodes,
    setAdminUserId: state.setAdminUserId,
    setEnabled: state.setEnabled,
    setAdminUserOptions: state.setAdminUserOptions,
    setSheetOpen: state.setSheetOpen,
    clearFieldError: state.clearFieldError,
    tenantBindableRoles: state.tenantBindableRoles,
  });

  const { handleSubmit } = useTenantsPageActions({
    editing: state.editing,
    name: state.name,
    phone: state.phone,
    location: state.location,
    orgId: state.orgId,
    systemRoleCodes: state.systemRoleCodes,
    adminUserId: state.adminUserId,
    enabled: state.enabled,
    orgs: state.orgs,
    clearFieldErrors: state.clearFieldErrors,
    setSectionError: state.setSectionError,
    setFieldErrors: state.setFieldErrors,
    clearFieldError: state.clearFieldError,
    setSheetOpen: state.setSheetOpen,
    setEditing: state.setEditing,
    setCredentials: state.setCredentials,
    load: state.load,
  });

  const { tenantColumns, tenantTable } = useTenantsPageTable({
    tenants: state.tenants,
    openEdit: form.openEdit,
  });

  return buildTenantsPageReturn({ state, form, handleSubmit, tenantColumns, tenantTable });
}
