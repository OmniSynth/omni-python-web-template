import type { CachedTenantDisplay } from "@/db/types";
import type { AuthUser, BoundTenantInfo } from "@/types/auth";

export const DEFAULT_DOCUMENT_TITLE = "omni-python-web-template";

/** 未登录或尚未选定租户时用默认标题；否则用当前租户名称（含缓存回退）。 */
export function resolveDocumentTitle(
  user: AuthUser | null,
  boundTenants: BoundTenantInfo[],
  cachedTenant: CachedTenantDisplay | null = null,
): string {
  if (!user || user.need_tenant_select || user.tenant_id == null) {
    return DEFAULT_DOCUMENT_TITLE;
  }
  const tenant = boundTenants.find((t) => t.id === user.tenant_id);
  const name = tenant?.name?.trim() ?? (cachedTenant?.tenant_id === user.tenant_id ? cachedTenant.name.trim() : "");
  return name || DEFAULT_DOCUMENT_TITLE;
}
