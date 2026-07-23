import { useCallback, useEffect, useState } from "react";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { api } from "@/lib/api";
import { DEFAULT_DATA_SCOPE } from "@/lib/data-scope";
import { useManagementScope } from "@/lib/management-scope";
import type { DeptRecord, PermissionInfo, RoleRecord } from "@/types/auth";
import { useRolesCreateState } from "./use-roles-create-state";

export function useRolesPageState() {
  const tenantScope = useManagementScope() === "tenant";
  const rolePerm = (system: string, tenant: string) => (tenantScope ? tenant : system);
  const create = useRolesCreateState();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [systemPermissions, setSystemPermissions] = useState<PermissionInfo[]>([]);
  const [tenantPermissions, setTenantPermissions] = useState<PermissionInfo[]>([]);
  const [pageLoadError, setPageLoadError] = useState("");
  const [funcPermOpen, setFuncPermOpen] = useState(false);
  const [dataScopeOpen, setDataScopeOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [selectedButtons, setSelectedButtons] = useState<string[]>([]);
  const [dataScope, setDataScope] = useState(DEFAULT_DATA_SCOPE);
  const [deptTree, setDeptTree] = useState<DeptRecord[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(new Set());
  const [dataScopeError, setDataScopeError] = useState("");
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } = useFieldErrors();

  const load = useCallback(async () => {
    if (tenantScope) {
      const [roleList, permissionTree] = await Promise.all([api.tenantRoles.list(), api.tenantRoles.listPermissions()]);
      setRoles(roleList);
      setSystemPermissions([]);
      setTenantPermissions(permissionTree);
      return;
    }
    const [roleList, systemTree, tenantTree] = await Promise.all([
      api.roles.list(),
      api.roles.listPermissions("system"),
      api.roles.listPermissions("tenant"),
    ]);
    setRoles(roleList);
    setSystemPermissions(systemTree);
    setTenantPermissions(tenantTree);
  }, [tenantScope]);

  useEffect(() => {
    void load()
      .then(() => setPageLoadError(""))
      .catch((err: Error) => setPageLoadError(err.message));
  }, [load]);

  return {
    tenantScope,
    rolePerm,
    roles,
    systemPermissions,
    tenantPermissions,
    pageLoadError,
    ...create,
    funcPermOpen,
    setFuncPermOpen,
    dataScopeOpen,
    setDataScopeOpen,
    editing,
    setEditing,
    selectedMenus,
    setSelectedMenus,
    selectedButtons,
    setSelectedButtons,
    dataScope,
    setDataScope,
    deptTree,
    setDeptTree,
    selectedDeptIds,
    setSelectedDeptIds,
    dataScopeError,
    setDataScopeError,
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFieldErrors,
    load,
  };
}
