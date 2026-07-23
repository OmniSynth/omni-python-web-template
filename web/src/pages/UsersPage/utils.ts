import { DEFAULT_DATA_SCOPE } from "@/lib/data-scope";
import type { UserRecord, UserTenantConfigItem } from "@/types/auth";
import { MEMBERSHIP_DEPARTED } from "@/types/auth";
import type { TenantDraft } from "./types";

export function isUserDeparted(u: UserRecord): boolean {
  return u.membership_status === MEMBERSHIP_DEPARTED;
}

export function customScopesFromDraft(draft: TenantDraft) {
  if (draft.data_scope !== 4) return [];
  return draft.custom_scope_dept_ids.map((scope_id) => ({
    scope_type: "dept" as const,
    scope_id,
  }));
}

export function draftFromTenantConfig(item: UserTenantConfigItem): TenantDraft {
  return {
    bound: item.bound,
    dept_id: item.dept_id ?? null,
    data_scope: item.data_scope ?? DEFAULT_DATA_SCOPE,
    custom_scope_dept_ids: (item.custom_scopes ?? [])
      .filter((scope) => scope.scope_type === "dept")
      .map((scope) => scope.scope_id),
  };
}
