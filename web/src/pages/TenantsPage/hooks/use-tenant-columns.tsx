import { useMemo } from "react";
import { createActionsColumn } from "@/components/table/table-row-actions";
import { useTimezone } from "@/contexts/TimezoneContext";
import type { TenantRecord } from "@/types/auth";
import type { TableColumnDef } from "@/types/table-preference";
import { formatTenantAdmin, formatTenantLocation } from "../utils";

export function useTenantColumns(openEdit: (tenant: TenantRecord) => void) {
  const { formatDateTime } = useTimezone();
  return useMemo<TableColumnDef<TenantRecord>[]>(
    () => [
      {
        id: "code",
        label: "编码",
        defaultWidth: 120,
        sortKey: "code",
        render: (t) => <span className="font-mono text-xs">{t.code}</span>,
      },
      { id: "name", label: "名称", defaultWidth: 140, sortKey: "name", render: (t) => t.name },
      {
        id: "phone",
        label: "手机号",
        defaultWidth: 120,
        render: (t) => <span className="font-mono text-xs">{t.phone || "—"}</span>,
      },
      {
        id: "admin",
        label: "管理员",
        defaultWidth: 140,
        render: (t) => <span className="text-xs">{formatTenantAdmin(t)}</span>,
      },
      { id: "location", label: "省市区", defaultWidth: 160, render: (t) => formatTenantLocation(t) },
      {
        id: "region",
        label: "地区编码",
        defaultWidth: 120,
        render: (t) => <span className="font-mono text-xs">{t.region || "—"}</span>,
      },
      {
        id: "enabled",
        label: "状态",
        defaultWidth: 80,
        sortKey: "enabled",
        render: (t) => (t.enabled ? "启用" : "禁用"),
      },
      {
        id: "expires_at",
        label: "套餐到期",
        defaultWidth: 160,
        render: (t) => (t.expires_at ? formatDateTime(t.expires_at) : "永不过期"),
      },
      createActionsColumn({
        defaultWidth: 80,
        actionDefs: [{ id: "edit", label: "编辑" }],
        renderItems: (t) => [
          { id: "edit", label: "编辑", permission: "system.tenant.update", onClick: () => void openEdit(t) },
        ],
      }),
    ],
    [formatDateTime, openEdit],
  );
}
