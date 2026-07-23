import { DEFAULT_DATA_SCOPE, validateDataScopeSelection } from "@/lib/data-scope";
import type { TenantDraft } from "../types";
import { customScopesFromDraft } from "../utils";

export function collectUserBindings(tenantDraft: Record<number, TenantDraft>) {
  return Object.entries(tenantDraft)
    .filter(([, draft]) => draft.bound)
    .map(([tenantId, draft]) => ({
      tenant_id: Number(tenantId),
      dept_id: draft.dept_id,
      data_scope: draft.data_scope,
      custom_scopes: customScopesFromDraft(draft),
    }));
}

export function currentTenantDraft(
  currentTenantId: number | null | undefined,
  tenantDraft: Record<number, TenantDraft>,
): TenantDraft | null {
  if (currentTenantId == null) return null;
  return tenantDraft[currentTenantId] ?? null;
}

export function currentTenantScopePayload(
  currentTenantId: number | null | undefined,
  tenantDraft: Record<number, TenantDraft>,
) {
  const draft = currentTenantDraft(currentTenantId, tenantDraft);
  if (!draft)
    return { data_scope: DEFAULT_DATA_SCOPE, custom_scopes: [] as { scope_type: "dept"; scope_id: number }[] };
  return {
    data_scope: draft.data_scope,
    custom_scopes: customScopesFromDraft(draft),
  };
}

export function currentTenantDeptId(
  currentTenantId: number | null | undefined,
  tenantDraft: Record<number, TenantDraft>,
): number | null {
  if (currentTenantId == null) return null;
  return tenantDraft[currentTenantId]?.dept_id ?? null;
}

export function validateUserDeptRequired({
  tenantScope,
  currentTenantId,
  tenantDraft,
}: {
  tenantScope: boolean;
  currentTenantId: number | null | undefined;
  tenantDraft: Record<number, TenantDraft>;
}): string | null {
  if (tenantScope) {
    if (currentTenantDeptId(currentTenantId, tenantDraft) == null) return "请选择部门";
    const draft = currentTenantDraft(currentTenantId, tenantDraft);
    const scopeError = draft
      ? validateDataScopeSelection(draft.data_scope, new Set(draft.custom_scope_dept_ids))
      : null;
    if (scopeError) return scopeError;
    return null;
  }

  const bindings = collectUserBindings(tenantDraft);
  if (bindings.some((b) => b.dept_id == null)) {
    return "每个已绑定租户须选择部门";
  }
  if (
    bindings.some((b) => {
      const deptIds = new Set(
        (b.custom_scopes ?? []).filter((scope) => scope.scope_type === "dept").map((scope) => scope.scope_id),
      );
      return validateDataScopeSelection(b.data_scope ?? DEFAULT_DATA_SCOPE, deptIds) != null;
    })
  ) {
    return "自定义数据权限须至少选择一个部门";
  }
  return null;
}
