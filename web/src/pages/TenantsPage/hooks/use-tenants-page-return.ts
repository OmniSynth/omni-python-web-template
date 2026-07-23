import type { SubmitEvent } from "react";
import type { useTenantsPageForm } from "./use-tenants-page-form";
import type { useTenantsPageState } from "./use-tenants-page-state";
import type { useTenantsPageTable } from "./use-tenants-page-table";

export function buildTenantsPageReturn({
  state,
  form,
  handleSubmit,
  tenantColumns,
  tenantTable,
}: {
  state: ReturnType<typeof useTenantsPageState>;
  form: ReturnType<typeof useTenantsPageForm>;
  handleSubmit: (e: SubmitEvent) => void;
  tenantColumns: ReturnType<typeof useTenantsPageTable>["tenantColumns"];
  tenantTable: ReturnType<typeof useTenantsPageTable>["tenantTable"];
}) {
  return {
    orgs: state.orgs,
    pageLoadError: state.pageLoadError,
    fieldErrors: state.fieldErrors,
    clearFieldError: state.clearFieldError,
    clearFieldErrors: state.clearFieldErrors,
    sectionError: state.sectionError,
    sheetOpen: state.sheetOpen,
    setSheetOpen: state.setSheetOpen,
    editing: state.editing,
    setEditing: state.setEditing,
    name: state.name,
    setName: state.setName,
    phone: state.phone,
    setPhone: state.setPhone,
    location: state.location,
    setLocation: state.setLocation,
    orgId: state.orgId,
    systemRoleCodes: state.systemRoleCodes,
    adminUserId: state.adminUserId,
    setAdminUserId: state.setAdminUserId,
    adminUserOptions: state.adminUserOptions,
    enabled: state.enabled,
    setEnabled: state.setEnabled,
    credentials: state.credentials,
    setCredentials: state.setCredentials,
    selectedOrg: state.selectedOrg,
    tenantBindableRoles: state.tenantBindableRoles,
    tenantColumns,
    tenantTable,
    openCreate: form.openCreate,
    handleOrgChange: (nextOrgId: string) => {
      const { nextOrgId: id, org } = form.handleOrgChange(nextOrgId);
      state.setOrgId(id);
      if (org) {
        state.setName(org.name);
        if (org.phone) state.setPhone(org.phone);
      }
    },
    toggleSystemRole: (code: string, checked: boolean) => {
      state.setSystemRoleCodes((prev) => form.toggleSystemRole(prev, code, checked));
      state.setSectionError("");
    },
    handleSubmit,
    setSectionError: state.setSectionError,
  };
}
