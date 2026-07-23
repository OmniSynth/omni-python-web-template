import type { SubmitEvent } from "react";
import type { RegionSelection } from "@/lib/china-region";
import type { OrganizationRecord, RoleRecord, TenantAdminUserOption } from "@/types/auth";

export const ADMIN_AUTO = "__auto__";

export const ORG_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "company", label: "企业" },
  { value: "government", label: "政府" },
  { value: "school", label: "学校" },
  { value: "hospital", label: "医院" },
  { value: "association", label: "协会" },
];

export const EMPTY_REGION: RegionSelection = {
  province: "",
  city: "",
  district: "",
  region: "",
};

export function formatAdminOptionLabel(u: TenantAdminUserOption): string {
  const base = u.display_name ? `${u.username}（${u.display_name}）` : u.username;
  return u.bound ? `${base} · 已绑定租户` : base;
}

export function orgTypeLabel(value: string): string {
  return ORG_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export interface OrgFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: OrganizationRecord | null;
  name: string;
  orgType: string;
  creditCode: string;
  phone: string;
  location: RegionSelection;
  systemRoleCodes: string[];
  tenantBindableRoles: RoleRecord[];
  adminUserId: string;
  adminUserOptions: TenantAdminUserOption[];
  enabled: boolean;
  fieldErrors: Record<string, string>;
  sectionError: string;
  onNameChange: (value: string) => void;
  onOrgTypeChange: (value: string) => void;
  onCreditCodeChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onLocationChange: (value: RegionSelection) => void;
  onAdminUserIdChange: (value: string) => void;
  onToggleSystemRole: (code: string, checked: boolean) => void;
  onEnabledChange: (enabled: boolean) => void;
  onClearFieldError: (field: string) => void;
  onSubmit: (e: SubmitEvent) => void;
}
