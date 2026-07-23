import { createActionsColumn } from "@/components/table/table-row-actions";
import { Badge } from "@/components/ui/badge";
import { formatDataScopeSummary } from "@/lib/data-scope";
import { permissionTreeForRoleType } from "@/lib/permission-tree-for-role";
import { assignmentSelectionTotal } from "@/lib/permissions";
import { ROLE_TYPE_LABELS } from "@/lib/role-type";
import type { PermissionInfo, RoleRecord } from "@/types/auth";
import type { TableColumnDef } from "@/types/table-preference";
import type { RolePermResolver } from "../types";

type BuildRoleColumnsOptions = {
  tenantScope: boolean;
  systemPermissions: PermissionInfo[];
  tenantPermissions: PermissionInfo[];
  formatDateTime: (value: string) => string;
  rolePerm: RolePermResolver;
  onOpenFunctionalPermissions: (role: RoleRecord) => void;
  onOpenDataScope: (role: RoleRecord) => void;
};

export function buildRoleTableColumns(options: BuildRoleColumnsOptions): TableColumnDef<RoleRecord>[] {
  const {
    tenantScope,
    systemPermissions,
    tenantPermissions,
    formatDateTime,
    rolePerm,
    onOpenFunctionalPermissions,
    onOpenDataScope,
  } = options;

  return [
    {
      id: "code",
      label: "Code",
      defaultWidth: 120,
      sortKey: "code",
      render: (role) => <span className="font-mono text-xs">{role.code}</span>,
    },
    {
      id: "name",
      label: "名称",
      defaultWidth: 120,
      sortKey: "name",
      render: (role) => (
        <span className="inline-flex items-center gap-2">
          {role.name}
          {role.system_managed ? <Badge variant="secondary">系统预置</Badge> : null}
        </span>
      ),
    },
    ...(tenantScope
      ? []
      : [
          {
            id: "role_type",
            label: "类型",
            defaultWidth: 80,
            sortKey: "role_type" as const,
            render: (role: RoleRecord) => (
              <span className="text-muted-foreground">
                {ROLE_TYPE_LABELS[role.role_type ?? "tenant"] ?? role.role_type}
              </span>
            ),
          },
        ]),
    {
      id: "created_at",
      label: "创建时间",
      defaultWidth: 180,
      sortKey: "created_at",
      render: (role) => formatDateTime(role.created_at),
    },
    {
      id: "description",
      label: "描述",
      defaultWidth: 200,
      render: (role) => <span className="text-muted-foreground">{role.description || "—"}</span>,
    },
    {
      id: "data_scope",
      label: "数据权限",
      defaultWidth: 140,
      render: (role) => formatDataScopeSummary(role.data_scope, role.custom_scopes),
    },
    {
      id: "permissions",
      label: "功能权限",
      defaultWidth: 80,
      render: (role) => {
        const tree = permissionTreeForRoleType(
          tenantScope ? "tenant" : role.role_type,
          systemPermissions,
          tenantPermissions,
        );
        return <span className="text-muted-foreground">{assignmentSelectionTotal(role.permissions, tree)}</span>;
      },
    },
    createActionsColumn({
      defaultWidth: 120,
      actionDefs: [
        { id: "permissions", label: "权限" },
        { id: "data", label: "数据" },
      ],
      renderItems: (role) => [
        {
          id: "permissions",
          label: "权限",
          permission: rolePerm("system.role.assign_permission", "tenant.role.assign_permission"),
          disabled: role.system_managed,
          onClick: () => onOpenFunctionalPermissions(role),
        },
        {
          id: "data",
          label: "数据",
          permission: rolePerm("system.role.update", "tenant.role.update"),
          disabled: role.system_managed,
          onClick: () => onOpenDataScope(role),
        },
      ],
    }),
  ];
}
