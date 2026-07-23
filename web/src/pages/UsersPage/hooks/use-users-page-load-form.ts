import { useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useManagementScope } from "@/lib/management-scope";
import { useUsersPageDept } from "./use-users-page-dept";
import { useUsersPageForm } from "./use-users-page-form";
import type { useUsersPageState } from "./use-users-page-state";

export function useUsersPageLoadAndForm(state: ReturnType<typeof useUsersPageState>) {
  const { user: current, boundTenants } = useAuth();
  const tenantScope = useManagementScope() === "tenant";

  const load = useCallback(async () => {
    const [list, roleList] = await Promise.all([
      tenantScope ? api.tenantUsers.list() : api.users.list(),
      tenantScope ? api.tenantRoles.list() : api.roles.list(),
    ]);
    state.setUsers(list);
    state.setRoles(roleList);
  }, [tenantScope, state.setUsers, state.setRoles]);

  useEffect(() => {
    load()
      .then(() => state.setPageLoadError(""))
      .catch((e: Error) => state.setPageLoadError(e.message));
  }, [load, state.setPageLoadError]);

  const dept = useUsersPageDept({
    tenantScope,
    currentTenantId: current?.tenant_id,
    currentDeptId: current?.dept_id,
    boundTenants,
    deptCache: state.deptCache,
    setDeptCache: state.setDeptCache,
    setTenantConfigs: state.setTenantConfigs,
    setTenantDraft: state.setTenantDraft,
  });

  const form = useUsersPageForm({
    tenantScope,
    currentTenantId: current?.tenant_id,
    clearFieldErrors: state.clearFieldErrors,
    setSectionError: state.setSectionError,
    setSheetMode: state.setSheetMode,
    setEditing: state.setEditing,
    setUsername: state.setUsername,
    setDisplayName: state.setDisplayName,
    setRoleIds: state.setRoleIds,
    setEnabled: state.setEnabled,
    setTenantConfigs: state.setTenantConfigs,
    setTenantDraft: state.setTenantDraft,
    setDeptCache: state.setDeptCache,
    setSheetOpen: state.setSheetOpen,
    ensureDeptOptions: dept.ensureDeptOptions,
    loadTenantOptionsForCreate: dept.loadTenantOptionsForCreate,
    initTenantDraft: dept.initTenantDraft,
  });

  return { tenantScope, current, dept, form, load };
}
