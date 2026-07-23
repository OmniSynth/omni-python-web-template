import type { Dispatch, SetStateAction } from "react";
import { DEFAULT_DATA_SCOPE, toggleDeptScopeCascade } from "@/lib/data-scope";
import type { DeptRecord } from "@/types/auth";
import type { TenantDraft } from "../types";

export function useUsersTenantDraft({
  setSectionError,
  setTenantDraft,
  clearFieldError,
  ensureDeptOptions,
  deptCache,
}: {
  setSectionError: (value: string) => void;
  setTenantDraft: Dispatch<SetStateAction<Record<number, TenantDraft>>>;
  clearFieldError: (field: string) => void;
  ensureDeptOptions: (tenantId: number, force?: boolean) => Promise<void>;
  deptCache: Record<number, DeptRecord[]>;
}) {
  function toggleTenantBound(tenantId: number, bound: boolean) {
    setSectionError("");
    setTenantDraft((prev) => ({
      ...prev,
      [tenantId]: {
        bound,
        dept_id: bound ? (prev[tenantId]?.dept_id ?? null) : null,
        data_scope: bound ? (prev[tenantId]?.data_scope ?? DEFAULT_DATA_SCOPE) : DEFAULT_DATA_SCOPE,
        custom_scope_dept_ids: bound ? (prev[tenantId]?.custom_scope_dept_ids ?? []) : [],
      },
    }));
    if (bound) {
      void ensureDeptOptions(tenantId);
    }
  }

  function setTenantDept(tenantId: number, deptIdValue: number | null) {
    clearFieldError("dept");
    setSectionError("");
    setTenantDraft((prev) => ({
      ...prev,
      [tenantId]: {
        bound: prev[tenantId]?.bound ?? true,
        dept_id: deptIdValue,
        data_scope: prev[tenantId]?.data_scope ?? DEFAULT_DATA_SCOPE,
        custom_scope_dept_ids: prev[tenantId]?.custom_scope_dept_ids ?? [],
      },
    }));
  }

  function setTenantDataScope(tenantId: number, dataScope: number) {
    setSectionError("");
    setTenantDraft((prev) => ({
      ...prev,
      [tenantId]: {
        bound: prev[tenantId]?.bound ?? true,
        dept_id: prev[tenantId]?.dept_id ?? null,
        data_scope: dataScope,
        custom_scope_dept_ids: dataScope === 4 ? (prev[tenantId]?.custom_scope_dept_ids ?? []) : [],
      },
    }));
  }

  function toggleTenantCustomDeptScope(tenantId: number, deptId: number, checked: boolean) {
    setSectionError("");
    const tree = deptCache[tenantId] ?? [];
    setTenantDraft((prev) => {
      const current = prev[tenantId]?.custom_scope_dept_ids ?? [];
      const next = [...toggleDeptScopeCascade(current, deptId, checked, tree)];
      return {
        ...prev,
        [tenantId]: {
          bound: prev[tenantId]?.bound ?? true,
          dept_id: prev[tenantId]?.dept_id ?? null,
          data_scope: prev[tenantId]?.data_scope ?? 4,
          custom_scope_dept_ids: next,
        },
      };
    });
  }

  return {
    toggleTenantBound,
    setTenantDept,
    setTenantDataScope,
    toggleTenantCustomDeptScope,
  };
}
