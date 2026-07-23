import type { Dispatch, SetStateAction } from "react";
import { api } from "@/lib/api";
import { defaultTenantBindableCodes } from "@/lib/role-type";
import type { OrganizationRecord, RoleRecord, TenantAdminUserOption, TenantRecord } from "@/types/auth";
import { ADMIN_AUTO, EMPTY_REGION } from "../types";

export function useTenantsPageForm({
  orgs,
  clearFieldErrors,
  setSectionError,
  setEditing,
  setName,
  setPhone,
  setLocation,
  setOrgId,
  setSystemRoleCodes,
  setAdminUserId,
  setEnabled,
  setAdminUserOptions,
  setSheetOpen,
  clearFieldError,
  tenantBindableRoles,
}: {
  orgs: OrganizationRecord[];
  clearFieldErrors: () => void;
  setSectionError: Dispatch<SetStateAction<string>>;
  setEditing: Dispatch<SetStateAction<TenantRecord | null>>;
  setName: Dispatch<SetStateAction<string>>;
  setPhone: Dispatch<SetStateAction<string>>;
  setLocation: Dispatch<SetStateAction<typeof EMPTY_REGION>>;
  setOrgId: Dispatch<SetStateAction<string>>;
  setSystemRoleCodes: Dispatch<SetStateAction<string[]>>;
  setAdminUserId: Dispatch<SetStateAction<string>>;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  setAdminUserOptions: Dispatch<SetStateAction<TenantAdminUserOption[]>>;
  setSheetOpen: Dispatch<SetStateAction<boolean>>;
  clearFieldError: (field: string) => void;
  tenantBindableRoles: RoleRecord[];
}) {
  async function openCreate() {
    clearFieldErrors();
    setSectionError("");
    setEditing(null);
    setName("");
    setPhone("");
    setLocation(EMPTY_REGION);
    setOrgId("");
    setSystemRoleCodes(defaultTenantBindableCodes(tenantBindableRoles));
    setAdminUserId(ADMIN_AUTO);
    setEnabled(true);
    setSheetOpen(true);
    try {
      setAdminUserOptions(await api.tenants.adminUserOptions());
    } catch {
      setAdminUserOptions([]);
    }
  }

  async function openEdit(tenant: TenantRecord) {
    clearFieldErrors();
    setSectionError("");
    setEditing(tenant);
    setName(tenant.name);
    setPhone(tenant.phone);
    setLocation({
      province: tenant.province,
      city: tenant.city,
      district: tenant.district,
      region: tenant.region,
    });
    setOrgId("");
    setEnabled(tenant.enabled);
    setAdminUserId(tenant.admin_user_id != null ? String(tenant.admin_user_id) : "");
    try {
      const [bindings, options] = await Promise.all([
        api.tenants.getSystemRoles(tenant.id),
        api.tenants.adminUserOptions(tenant.id),
      ]);
      setSystemRoleCodes(
        bindings.role_codes.length > 0 ? bindings.role_codes : defaultTenantBindableCodes(tenantBindableRoles),
      );
      setAdminUserOptions(options);
    } catch {
      setSystemRoleCodes(defaultTenantBindableCodes(tenantBindableRoles));
      setAdminUserOptions([]);
    }
    setSheetOpen(true);
  }

  function handleOrgChange(nextOrgId: string) {
    clearFieldError("orgId");
    const org = orgs.find((o) => String(o.id) === nextOrgId);
    return { nextOrgId, org };
  }

  function toggleSystemRole(prev: string[], code: string, checked: boolean) {
    if (checked) return prev.includes(code) ? prev : [...prev, code];
    return prev.filter((c) => c !== code);
  }

  return { openCreate, openEdit, handleOrgChange, toggleSystemRole };
}
