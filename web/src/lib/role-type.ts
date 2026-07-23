import type { RoleRecord } from "@/types/auth";

export const ROLE_TYPE_LABELS: Record<string, string> = {
  system: "系统",
  tenant: "租户",
};

export function defaultTenantBindableCodes(roles: RoleRecord[]): string[] {
  const preferred = roles.filter((r) => r.code === "operator" || r.code === "viewer").map((r) => r.code);
  if (preferred.length > 0) return preferred;
  return roles.map((r) => r.code);
}

export function tenantBindableRoleOptions(roles: RoleRecord[]): { value: string; label: string }[] {
  return roles.map((role) => ({ value: role.code, label: role.name || role.code }));
}
