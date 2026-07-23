import { useTimezone } from "@/contexts/TimezoneContext";
import { useClientTable } from "@/hooks/useClientTable";
import type { PermissionInfo, RoleRecord } from "@/types/auth";
import { useRoleColumns } from "./use-role-columns";

export function useRolesPageTable({
  tenantScope,
  systemPermissions,
  tenantPermissions,
  rolePerm,
  roles,
  onOpenFunctionalPermissions,
  onOpenDataScope,
}: {
  tenantScope: boolean;
  systemPermissions: PermissionInfo[];
  tenantPermissions: PermissionInfo[];
  rolePerm: (system: string, tenant: string) => string;
  roles: RoleRecord[];
  onOpenFunctionalPermissions: (role: RoleRecord) => void;
  onOpenDataScope: (role: RoleRecord) => void;
}) {
  const { formatDateTime } = useTimezone();
  const roleColumns = useRoleColumns({
    tenantScope,
    systemPermissions,
    tenantPermissions,
    formatDateTime,
    rolePerm,
    onOpenFunctionalPermissions,
    onOpenDataScope,
  });
  const roleTable = useClientTable({ pageKey: "roles", tableKey: "main", rows: roles, defaultColumns: roleColumns });
  return { roleColumns, roleTable };
}
