import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import { api } from "@/lib/api";
import type { RegionSelection } from "@/lib/china-region";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type { OrganizationRecord, ProvisionCredentials, TenantRecord } from "@/types/auth";
import { ADMIN_AUTO } from "../types";

export function useTenantsPageActions({
  editing,
  name,
  phone,
  location,
  orgId,
  systemRoleCodes,
  adminUserId,
  enabled,
  orgs,
  clearFieldErrors,
  setSectionError,
  setFieldErrors,
  clearFieldError,
  setSheetOpen,
  setEditing,
  setCredentials,
  load,
}: {
  editing: TenantRecord | null;
  name: string;
  phone: string;
  location: RegionSelection;
  orgId: string;
  systemRoleCodes: string[];
  adminUserId: string;
  enabled: boolean;
  orgs: OrganizationRecord[];
  clearFieldErrors: () => void;
  setSectionError: Dispatch<SetStateAction<string>>;
  setFieldErrors: (errors: Record<string, string>) => void;
  clearFieldError: (field: string) => void;
  setSheetOpen: Dispatch<SetStateAction<boolean>>;
  setEditing: Dispatch<SetStateAction<TenantRecord | null>>;
  setCredentials: Dispatch<SetStateAction<ProvisionCredentials | null>>;
  load: () => Promise<void>;
}) {
  function handleOrgChange(nextOrgId: string) {
    const org = orgs.find((o) => String(o.id) === nextOrgId);
    return { nextOrgId, org };
  }

  function toggleSystemRole(prev: string[], code: string, checked: boolean) {
    if (checked) return prev.includes(code) ? prev : [...prev, code];
    return prev.filter((c) => c !== code);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    clearFieldErrors();
    setSectionError("");
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "请填写租户名称";

    if (!editing) {
      if (!orgId) errors.orgId = "请选择所属机构";
      if (!phone.trim()) errors.phone = "请填写租户手机号";
      if (!location.province || !location.city || !location.district) {
        errors.location = "请选择省份、城市、区县";
      }
    } else if (!location.province || !location.city || !location.district || !location.region) {
      errors.location = "请选择省份、城市、区县";
    }

    const selectedAdminId = adminUserId && adminUserId !== ADMIN_AUTO ? Number(adminUserId) : undefined;
    if (editing && selectedAdminId == null) {
      errors.adminUserId = "请选择租户管理员";
    }

    const roleError = !editing && systemRoleCodes.length === 0;
    if (roleError) setSectionError("至少选择一个系统角色");

    if (Object.keys(errors).length > 0 || roleError) {
      if (Object.keys(errors).length > 0) setFieldErrors(errors);
      return;
    }

    try {
      if (editing) {
        await api.tenants.update(editing.id, {
          name: name.trim(),
          province: location.province,
          city: location.city,
          district: location.district,
          region: location.region,
          phone: phone.trim() || undefined,
          admin_user_id: selectedAdminId,
          enabled,
        });
        if (systemRoleCodes.length > 0) {
          await api.tenants.setSystemRoles(editing.id, systemRoleCodes);
        }
      } else {
        const result = await api.tenants.create({
          name: name.trim(),
          province: location.province,
          city: location.city,
          district: location.district,
          region: location.region,
          org_id: Number(orgId),
          phone: phone.trim(),
          admin_user_id: selectedAdminId,
          system_role_codes: systemRoleCodes,
          enabled,
        });
        if (result.admin_credentials) {
          setCredentials(result.admin_credentials);
        }
      }
      setSheetOpen(false);
      setEditing(null);
      clearFieldErrors();
      setSectionError("");
      await load();
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    }
  }

  return { handleOrgChange, toggleSystemRole, handleSubmit, clearFieldError };
}
