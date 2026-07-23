import { useClientTable } from "@/hooks/useClientTable";
import { useOrgColumns } from "./use-org-columns";
import { useOrgsPageActions } from "./use-orgs-page-actions";
import { useOrgsPageForm } from "./use-orgs-page-form";
import { useOrgsPageState } from "./use-orgs-page-state";

export function useOrgsPage() {
  const state = useOrgsPageState();

  const {
    openCreate,
    openEdit,
    toggleSystemRole: toggleRole,
  } = useOrgsPageForm({
    clearFieldErrors: state.clearFieldErrors,
    setSectionError: state.setSectionError,
    setEditing: state.setEditing,
    setName: state.setName,
    setOrgType: state.setOrgType,
    setCreditCode: state.setCreditCode,
    setPhone: state.setPhone,
    setLocation: state.setLocation,
    setSystemRoleCodes: state.setSystemRoleCodes,
    setAdminUserId: state.setAdminUserId,
    setEnabled: state.setEnabled,
    setAdminUserOptions: state.setAdminUserOptions,
    setSheetOpen: state.setSheetOpen,
    tenantBindableRoles: state.tenantBindableRoles,
  });

  const { handleSubmit } = useOrgsPageActions({
    editing: state.editing,
    name: state.name,
    orgType: state.orgType,
    creditCode: state.creditCode,
    phone: state.phone,
    location: state.location,
    systemRoleCodes: state.systemRoleCodes,
    adminUserId: state.adminUserId,
    enabled: state.enabled,
    clearFieldErrors: state.clearFieldErrors,
    setSectionError: state.setSectionError,
    setFieldErrors: state.setFieldErrors,
    setSheetOpen: state.setSheetOpen,
    setEditing: state.setEditing,
    setCredentials: state.setCredentials,
    load: state.load,
  });

  const orgColumns = useOrgColumns(openEdit);
  const orgTable = useClientTable({
    pageKey: "orgs",
    tableKey: "main",
    rows: state.orgs,
    defaultColumns: orgColumns,
  });

  return {
    pageLoadError: state.pageLoadError,
    orgColumns,
    orgTable,
    sheetOpen: state.sheetOpen,
    setSheetOpen: state.setSheetOpen,
    editing: state.editing,
    setEditing: state.setEditing,
    name: state.name,
    setName: state.setName,
    orgType: state.orgType,
    setOrgType: state.setOrgType,
    creditCode: state.creditCode,
    setCreditCode: state.setCreditCode,
    phone: state.phone,
    setPhone: state.setPhone,
    location: state.location,
    setLocation: state.setLocation,
    systemRoleCodes: state.systemRoleCodes,
    tenantBindableRoles: state.tenantBindableRoles,
    adminUserId: state.adminUserId,
    setAdminUserId: state.setAdminUserId,
    adminUserOptions: state.adminUserOptions,
    enabled: state.enabled,
    setEnabled: state.setEnabled,
    credentials: state.credentials,
    setCredentials: state.setCredentials,
    fieldErrors: state.fieldErrors,
    sectionError: state.sectionError,
    setSectionError: state.setSectionError,
    clearFieldErrors: state.clearFieldErrors,
    clearFieldError: state.clearFieldError,
    openCreate,
    toggleSystemRole: (code: string, checked: boolean) => toggleRole(state.setSystemRoleCodes, code, checked),
    handleSubmit,
  };
}
