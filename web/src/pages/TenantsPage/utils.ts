import { formatRegionAddress } from "@/lib/china-region";
import type { OrganizationRecord, TenantAdminUserOption, TenantRecord } from "@/types/auth";
import { INDUSTRY_PREFIX } from "./types";

export function formatAdminOptionLabel(u: TenantAdminUserOption): string {
  const base = u.display_name ? `${u.username}（${u.display_name}）` : u.username;
  return u.bound ? `${base} · 已绑定租户` : base;
}

export function formatTenantAdmin(tenant: TenantRecord): string {
  if (tenant.admin_username) {
    return tenant.admin_display_name
      ? `${tenant.admin_username}（${tenant.admin_display_name}）`
      : tenant.admin_username;
  }
  return "—";
}

export function previewCodePrefix(org: OrganizationRecord | undefined, region: string): string | null {
  if (!org || !region.trim()) return null;
  const reg = region.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  if (reg.length < 2) return null;
  const ind = INDUSTRY_PREFIX[org.org_type] ?? "gn";
  return `${ind}-${reg.slice(0, 8)}-####`;
}

export function formatTenantLocation(tenant: TenantRecord): string {
  const address = formatRegionAddress(tenant.province, tenant.city, tenant.district);
  if (address) return address;
  return tenant.region || "—";
}
