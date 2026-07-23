import { useMemo } from "react";
import { Can } from "@/components/Can";
import { createActionsColumn } from "@/components/table/table-row-actions";
import { Switch } from "@/components/ui/switch";
import { formatDataScopeSummary } from "@/lib/data-scope";
import type { UserRecord } from "@/types/auth";
import type { TableColumnDef } from "@/types/table-preference";
import { isUserDeparted } from "../utils";

export function useUserColumns({
  formatDateTime,
  tenantScope,
  currentId,
  userPerm,
  openEdit,
  resettingId,
  toggleEnabled,
  handleResetPassword,
  setOffboardTarget,
}: {
  formatDateTime: (value: string) => string;
  tenantScope: boolean;
  currentId: number | undefined;
  userPerm: (system: string, tenant: string) => string;
  openEdit: (user: UserRecord) => void | Promise<void>;
  resettingId: number | null;
  toggleEnabled: (u: UserRecord) => void | Promise<void>;
  handleResetPassword: (u: UserRecord) => void | Promise<void>;
  setOffboardTarget: (u: UserRecord | null) => void;
}) {
  return useMemo<TableColumnDef<UserRecord>[]>(
    () => [
      { id: "id", label: "ID", defaultWidth: 64, sortKey: "id", render: (u) => u.id },
      { id: "username", label: "用户名", defaultWidth: 120, sortKey: "username", render: (u) => u.username },
      {
        id: "display_name",
        label: "显示名",
        defaultWidth: 120,
        sortKey: "display_name",
        render: (u) => u.display_name,
      },
      {
        id: "roles",
        label: "角色",
        defaultWidth: 160,
        render: (u) => u.roles.map((r) => r.name).join("、") || "—",
      },
      {
        id: "data_scope",
        label: "数据权限",
        defaultWidth: 140,
        render: (u) =>
          tenantScope || u.data_scope != null ? formatDataScopeSummary(u.data_scope, u.custom_scopes) : "—",
      },
      {
        id: "created_at",
        label: "创建时间",
        defaultWidth: 180,
        sortKey: "created_at",
        render: (u) => formatDateTime(u.created_at),
      },
      ...(tenantScope
        ? [
            {
              id: "membership_status",
              label: "状态",
              defaultWidth: 80,
              render: (u: UserRecord) => (isUserDeparted(u) ? "离职" : "在职"),
            } satisfies TableColumnDef<UserRecord>,
          ]
        : []),
      {
        id: "enabled",
        label: "启用",
        defaultWidth: 80,
        sortKey: "enabled",
        render: (u) => (
          <Can permission={userPerm("system.user.enable", "tenant.user.enable")}>
            <Switch
              checked={u.enabled}
              disabled={u.id === currentId || (tenantScope && isUserDeparted(u))}
              onCheckedChange={() => void toggleEnabled(u)}
            />
          </Can>
        ),
      },
      createActionsColumn({
        defaultWidth: 160,
        actionDefs: [
          { id: "reset", label: "重置" },
          { id: "offboard", label: "离职" },
          { id: "edit", label: "编辑" },
        ],
        renderItems: (u) => [
          {
            id: "reset",
            label: "重置",
            permission: "system.user.reset_password",
            hidden: tenantScope,
            disabled: resettingId === u.id,
            onClick: () => void handleResetPassword(u),
          },
          {
            id: "offboard",
            label: "离职",
            permission: "tenant.user.offboard",
            hidden: !tenantScope || isUserDeparted(u),
            disabled: u.id === currentId,
            onClick: () => setOffboardTarget(u),
          },
          {
            id: "edit",
            label: "编辑",
            permission: userPerm("system.user.update", "tenant.user.update"),
            hidden: isUserDeparted(u) || (tenantScope && u.id === currentId),
            onClick: () => void openEdit(u),
          },
        ],
      }),
    ],
    [
      currentId,
      formatDateTime,
      openEdit,
      resettingId,
      tenantScope,
      toggleEnabled,
      userPerm,
      handleResetPassword,
      setOffboardTarget,
    ],
  );
}
