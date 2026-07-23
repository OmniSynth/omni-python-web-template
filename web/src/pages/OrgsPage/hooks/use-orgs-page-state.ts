import { useCallback, useEffect, useState } from "react";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { api } from "@/lib/api";
import type { RegionSelection } from "@/lib/china-region";
import { defaultTenantBindableCodes } from "@/lib/role-type";
import type { OrganizationRecord, ProvisionCredentials, RoleRecord, TenantAdminUserOption } from "@/types/auth";
import { ADMIN_AUTO, EMPTY_REGION } from "../types";

export function useOrgsPageState() {
  const [orgs, setOrgs] = useState<OrganizationRecord[]>([]);
  const [tenantBindableRoles, setTenantBindableRoles] = useState<RoleRecord[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } = useFieldErrors();
  const [sectionError, setSectionError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationRecord | null>(null);
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("company");
  const [creditCode, setCreditCode] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState<RegionSelection>(EMPTY_REGION);
  const [systemRoleCodes, setSystemRoleCodes] = useState<string[]>([]);
  const [adminUserId, setAdminUserId] = useState(ADMIN_AUTO);
  const [adminUserOptions, setAdminUserOptions] = useState<TenantAdminUserOption[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [credentials, setCredentials] = useState<ProvisionCredentials | null>(null);

  const load = useCallback(async () => {
    const [orgList, bindableRoles] = await Promise.all([api.orgs.list(), api.roles.listTenantBindable()]);
    setOrgs(orgList);
    setTenantBindableRoles(bindableRoles);
    setSystemRoleCodes((current) => (current.length > 0 ? current : defaultTenantBindableCodes(bindableRoles)));
  }, []);

  useEffect(() => {
    load()
      .then(() => setPageLoadError(""))
      .catch((err: Error) => setPageLoadError(err.message));
  }, [load]);

  return {
    orgs,
    pageLoadError,
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
    sectionError,
    setSectionError,
    sheetOpen,
    setSheetOpen,
    editing,
    setEditing,
    name,
    setName,
    orgType,
    setOrgType,
    creditCode,
    setCreditCode,
    phone,
    setPhone,
    location,
    setLocation,
    systemRoleCodes,
    setSystemRoleCodes,
    adminUserId,
    setAdminUserId,
    adminUserOptions,
    setAdminUserOptions,
    enabled,
    setEnabled,
    credentials,
    setCredentials,
    tenantBindableRoles,
    load,
  };
}
