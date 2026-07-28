import type { Dispatch, SetStateAction, SubmitEvent } from "react";
import { api } from "@/lib/api";
import type { RegionSelection } from "@/lib/china-region";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type { OrganizationRecord, ProvisionCredentials } from "@/types/auth";
import { ADMIN_AUTO } from "../types";

export function useOrgsPageActions({
  editing,
  name,
  orgType,
  creditCode,
  phone,
  location,
  systemRoleCodes,
  adminUserId,
  enabled,
  clearFieldErrors,
  setSectionError,
  setFieldErrors,
  setSheetOpen,
  setEditing,
  setCredentials,
  load,
}: {
  editing: OrganizationRecord | null;
  name: string;
  orgType: string;
  creditCode: string;
  phone: string;
  location: RegionSelection;
  systemRoleCodes: string[];
  adminUserId: string;
  enabled: boolean;
  clearFieldErrors: () => void;
  setSectionError: Dispatch<SetStateAction<string>>;
  setFieldErrors: (errors: Record<string, string>) => void;
  setSheetOpen: Dispatch<SetStateAction<boolean>>;
  setEditing: Dispatch<SetStateAction<OrganizationRecord | null>>;
  setCredentials: Dispatch<SetStateAction<ProvisionCredentials | null>>;
  load: () => Promise<void>;
}) {
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    clearFieldErrors();
    setSectionError("");
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = "请填写机构名称";
    if (!creditCode.trim()) errors.creditCode = "请填写统一社会信用代码";

    if (editing) {
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    } else {
      if (!phone.trim()) errors.phone = "请填写机构手机号";
      if (!location.province || !location.city || !location.district) {
        errors.location = "请选择省份、城市、区县";
      }
      const roleError = systemRoleCodes.length === 0;
      if (roleError) setSectionError("至少选择一个系统角色");

      if (Object.keys(errors).length > 0 || roleError) {
        if (Object.keys(errors).length > 0) setFieldErrors(errors);
        return;
      }
    }

    try {
      if (editing) {
        await api.orgs.update(editing.id, {
          name: name.trim(),
          org_type: orgType,
          credit_code: creditCode.trim(),
          phone: phone.trim() || undefined,
          enabled,
        });
      } else {
        const selectedAdminId = adminUserId && adminUserId !== ADMIN_AUTO ? Number(adminUserId) : undefined;
        const result = await api.orgs.create({
          name: name.trim(),
          org_type: orgType,
          credit_code: creditCode.trim(),
          phone: phone.trim(),
          province: location.province,
          city: location.city,
          district: location.district,
          region: location.region,
          admin_user_id: selectedAdminId,
          system_role_codes: systemRoleCodes,
          enabled,
        });
        if (result.admin_credentials) {
          setCredentials({ ...result.admin_credentials, site_name: name.trim() });
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

  return { handleSubmit };
}
