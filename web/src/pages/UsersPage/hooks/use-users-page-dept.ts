import type { Dispatch, SetStateAction } from "react";
import { api } from "@/lib/api";
import { DEFAULT_DATA_SCOPE } from "@/lib/data-scope";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type { DeptRecord, UserTenantConfigItem } from "@/types/auth";
import type { TenantDraft } from "../types";
import { draftFromTenantConfig } from "../utils";

export function useUsersPageDept({
  tenantScope,
  currentTenantId,
  currentDeptId,
  boundTenants,
  deptCache,
  setDeptCache,
  setTenantConfigs,
  setTenantDraft,
}: {
  tenantScope: boolean;
  currentTenantId: number | null | undefined;
  currentDeptId?: number | null;
  boundTenants: {
    id: number;
    name: string;
    code: string;
    province: string;
    city: string;
    district: string;
    org_name: string;
    org_credit_code: string;
    dept_id?: number | null;
    dept_name?: string | null;
  }[];
  deptCache: Record<number, DeptRecord[]>;
  setDeptCache: Dispatch<SetStateAction<Record<number, DeptRecord[]>>>;
  setTenantConfigs: Dispatch<SetStateAction<UserTenantConfigItem[]>>;
  setTenantDraft: Dispatch<SetStateAction<Record<number, TenantDraft>>>;
}) {
  async function ensureDeptOptions(tenantId: number, force = false) {
    if (!force && tenantId in deptCache) return;
    try {
      const tree = tenantScope ? await api.tenantDepts.tree() : await api.depts.tree(tenantId);
      setDeptCache((prev) => ({ ...prev, [tenantId]: tree }));
    } catch (err) {
      showToastError(errorMessage(err, "加载部门树失败"));
      setDeptCache((prev) => {
        const next = { ...prev };
        delete next[tenantId];
        return next;
      });
    }
  }

  async function initTenantDraft(configs: UserTenantConfigItem[]) {
    setTenantConfigs(configs);
    const draft: Record<number, TenantDraft> = {};
    for (const item of configs) {
      draft[item.tenant_id] = draftFromTenantConfig(item);
      if (item.bound) {
        await ensureDeptOptions(item.tenant_id);
      }
    }
    setTenantDraft(draft);
  }

  async function loadTenantOptionsForCreate() {
    const applyCreateDefaults = async (configs: UserTenantConfigItem[]) => {
      setTenantConfigs(configs);
      const draft: Record<number, TenantDraft> = {};
      for (const item of configs) {
        const base = draftFromTenantConfig(item);
        draft[item.tenant_id] = {
          ...base,
          data_scope: DEFAULT_DATA_SCOPE,
          custom_scope_dept_ids: [],
        };
        if (item.bound) {
          await ensureDeptOptions(item.tenant_id);
        }
      }
      setTenantDraft(draft);
    };

    try {
      const configs = await api.users.tenantOptions(currentTenantId != null ? currentTenantId : undefined);
      await applyCreateDefaults(configs);
    } catch {
      const fallback: UserTenantConfigItem[] = boundTenants.map((t) => ({
        tenant_id: t.id,
        tenant_name: t.name,
        tenant_code: t.code,
        province: t.province,
        city: t.city,
        district: t.district,
        org_name: t.org_name,
        org_credit_code: t.org_credit_code,
        tenant_enabled: true,
        bound: t.id === currentTenantId,
        dept_id: t.dept_id ?? null,
        dept_name: t.dept_name ?? null,
        data_scope: DEFAULT_DATA_SCOPE,
        custom_scopes: [],
      }));
      if (fallback.length === 0 && currentTenantId != null) {
        fallback.push({
          tenant_id: currentTenantId,
          tenant_name: `租户 ${currentTenantId}`,
          tenant_code: "",
          province: "",
          city: "",
          district: "",
          org_name: "",
          org_credit_code: "",
          tenant_enabled: true,
          bound: true,
          dept_id: currentDeptId ?? null,
          dept_name: null,
          data_scope: DEFAULT_DATA_SCOPE,
          custom_scopes: [],
        });
      }
      await applyCreateDefaults(fallback);
    }
  }

  return { ensureDeptOptions, initTenantDraft, loadTenantOptionsForCreate };
}
