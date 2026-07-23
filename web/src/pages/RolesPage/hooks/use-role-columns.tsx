import { useMemo } from "react";
import type { PermissionInfo, RoleRecord } from "@/types/auth";
import type { TableColumnDef } from "@/types/table-preference";
import type { RolePermResolver } from "../types";
import { buildRoleTableColumns } from "./role-table-columns";

export function useRoleColumns(options: {
  tenantScope: boolean;
  systemPermissions: PermissionInfo[];
  tenantPermissions: PermissionInfo[];
  formatDateTime: (value: string) => string;
  rolePerm: RolePermResolver;
  onOpenFunctionalPermissions: (role: RoleRecord) => void;
  onOpenDataScope: (role: RoleRecord) => void;
}) {
  const {
    tenantScope,
    systemPermissions,
    tenantPermissions,
    formatDateTime,
    rolePerm,
    onOpenFunctionalPermissions,
    onOpenDataScope,
  } = options;

  return useMemo<TableColumnDef<RoleRecord>[]>(
    () =>
      buildRoleTableColumns({
        tenantScope,
        systemPermissions,
        tenantPermissions,
        formatDateTime,
        rolePerm,
        onOpenFunctionalPermissions,
        onOpenDataScope,
      }),
    [
      tenantScope,
      systemPermissions,
      tenantPermissions,
      formatDateTime,
      rolePerm,
      onOpenFunctionalPermissions,
      onOpenDataScope,
    ],
  );
}
