import type { Dispatch, SetStateAction } from "react";
import { api } from "@/lib/api";
import { DEFAULT_DATA_SCOPE } from "@/lib/data-scope";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import type { DeptRecord, UserRecord } from "@/types/auth";
import type { SheetMode, TenantDraft } from "../types";

export function useUsersPageForm({
  tenantScope,
  currentTenantId,
  clearFieldErrors,
  setSectionError,
  setSheetMode,
  setEditing,
  setUsername,
  setDisplayName,
  setRoleIds,
  setEnabled,
  setTenantConfigs,
  setTenantDraft,
  setDeptCache,
  setSheetOpen,
  ensureDeptOptions,
  loadTenantOptionsForCreate,
  initTenantDraft,
}: {
  tenantScope: boolean;
  currentTenantId: number | null | undefined;
  clearFieldErrors: () => void;
  setSectionError: (value: string) => void;
  setSheetMode: Dispatch<SetStateAction<SheetMode>>;
  setEditing: Dispatch<SetStateAction<UserRecord | null>>;
  setUsername: Dispatch<SetStateAction<string>>;
  setDisplayName: Dispatch<SetStateAction<string>>;
  setRoleIds: Dispatch<SetStateAction<number[]>>;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  setTenantConfigs: Dispatch<SetStateAction<import("@/types/auth").UserTenantConfigItem[]>>;
  setTenantDraft: Dispatch<SetStateAction<Record<number, TenantDraft>>>;
  setDeptCache: Dispatch<SetStateAction<Record<number, DeptRecord[]>>>;
  setSheetOpen: Dispatch<SetStateAction<boolean>>;
  ensureDeptOptions: (tenantId: number, force?: boolean) => Promise<void>;
  loadTenantOptionsForCreate: () => Promise<void>;
  initTenantDraft: (configs: import("@/types/auth").UserTenantConfigItem[]) => Promise<void>;
}) {
  function resetForm() {
    setUsername("");
    setDisplayName("");
    setRoleIds([]);
    setEnabled(true);
    setTenantConfigs([]);
    setTenantDraft({});
    setDeptCache({});
  }

  async function openCreate() {
    clearFieldErrors();
    setSectionError("");
    setSheetMode("create");
    setEditing(null);
    resetForm();
    if (tenantScope && currentTenantId != null) {
      await ensureDeptOptions(currentTenantId, true);
      setTenantDraft({
        [currentTenantId]: { bound: true, dept_id: null, data_scope: DEFAULT_DATA_SCOPE, custom_scope_dept_ids: [] },
      });
    } else {
      await loadTenantOptionsForCreate();
    }
    setSheetOpen(true);
  }

  async function openEdit(user: UserRecord) {
    clearFieldErrors();
    setSectionError("");
    setSheetMode("edit");
    setEditing(user);
    setDisplayName(user.display_name);
    setRoleIds(user.roles.map((r) => r.id));
    setEnabled(user.enabled);
    try {
      if (tenantScope && currentTenantId != null) {
        await ensureDeptOptions(currentTenantId, true);
        setTenantConfigs([]);
        setTenantDraft({
          [currentTenantId]: {
            bound: true,
            dept_id: user.dept_id ?? null,
            data_scope: user.data_scope ?? DEFAULT_DATA_SCOPE,
            custom_scope_dept_ids: (user.custom_scopes ?? [])
              .filter((scope) => scope.scope_type === "dept")
              .map((scope) => scope.scope_id),
          },
        });
      } else {
        const configs = await api.users.listTenants(user.id);
        await initTenantDraft(configs);
      }
    } catch (err) {
      showToastError(errorMessage(err, "加载用户配置失败"));
      return;
    }
    setSheetOpen(true);
  }

  function handleSheetOpenChange(open: boolean, setSheetOpenFn: Dispatch<SetStateAction<boolean>>) {
    setSheetOpenFn(open);
    if (!open) {
      clearFieldErrors();
      setSectionError("");
    }
  }

  return { resetForm, openCreate, openEdit, handleSheetOpenChange };
}
