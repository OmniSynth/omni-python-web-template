import type { Dispatch, SetStateAction } from "react";
import { api } from "@/lib/api";
import { defaultTenantBindableCodes } from "@/lib/role-type";
import type { OrganizationRecord, RoleRecord, TenantAdminUserOption } from "@/types/auth";
import { ADMIN_AUTO, EMPTY_REGION } from "../types";

export function useOrgsPageForm({
  clearFieldErrors,
  setSectionError,
  setEditing,
  setName,
  setOrgType,
  setCreditCode,
  setPhone,
  setLocation,
  setSystemRoleCodes,
  setAdminUserId,
  setEnabled,
  setAdminUserOptions,
  setSheetOpen,
  tenantBindableRoles,
}: {
  clearFieldErrors: () => void;
  setSectionError: Dispatch<SetStateAction<string>>;
  setEditing: Dispatch<SetStateAction<OrganizationRecord | null>>;
  setName: Dispatch<SetStateAction<string>>;
  setOrgType: Dispatch<SetStateAction<string>>;
  setCreditCode: Dispatch<SetStateAction<string>>;
  setPhone: Dispatch<SetStateAction<string>>;
  setLocation: Dispatch<SetStateAction<typeof EMPTY_REGION>>;
  setSystemRoleCodes: Dispatch<SetStateAction<string[]>>;
  setAdminUserId: Dispatch<SetStateAction<string>>;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  setAdminUserOptions: Dispatch<SetStateAction<TenantAdminUserOption[]>>;
  setSheetOpen: Dispatch<SetStateAction<boolean>>;
  tenantBindableRoles: RoleRecord[];
}) {
  async function openCreate() {
    clearFieldErrors();
    setSectionError("");
    setEditing(null);
    setName("");
    setOrgType("company");
    setCreditCode("");
    setPhone("");
    setLocation(EMPTY_REGION);
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

  function openEdit(org: OrganizationRecord) {
    clearFieldErrors();
    setSectionError("");
    setEditing(org);
    setName(org.name);
    setOrgType(org.org_type);
    setCreditCode(org.credit_code);
    setPhone(org.phone);
    setEnabled(org.enabled);
    setSheetOpen(true);
  }

  function toggleSystemRole(setter: Dispatch<SetStateAction<string[]>>, code: string, checked: boolean) {
    setter((prev) => {
      if (checked) return prev.includes(code) ? prev : [...prev, code];
      return prev.filter((c) => c !== code);
    });
    setSectionError("");
  }

  return { openCreate, openEdit, toggleSystemRole };
}
