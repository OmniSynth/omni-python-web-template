/** Dexie 本地库行类型。 */

import type { AuthUser, PermissionInfo } from "@/types/auth";
import type { TablePreferenceConfig } from "@/types/table-preference";

export const SESSION_ROW_ID = "current";

/** 当前选中租户的展示信息（顶栏、标签页防刷新抖动）。 */
export interface CachedTenantDisplay {
  tenant_id: number;
  name: string;
  code: string;
}

export interface SessionRow {
  id: typeof SESSION_ROW_ID;
  token: string | null;
  user: AuthUser | null;
  navTree: PermissionInfo[];
  tenantDisplay: CachedTenantDisplay | null;
}

export interface CachedTablePreference {
  config: TablePreferenceConfig;
  updatedAt: string;
  syncedAt: string;
}

export interface TablePreferenceRow extends CachedTablePreference {
  id: string;
}
