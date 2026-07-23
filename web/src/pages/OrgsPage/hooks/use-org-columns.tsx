import { useMemo } from "react";
import { createActionsColumn } from "@/components/table/table-row-actions";
import type { OrganizationRecord } from "@/types/auth";
import type { TableColumnDef } from "@/types/table-preference";
import { orgTypeLabel } from "../types";

export function useOrgColumns(onOpenEdit: (org: OrganizationRecord) => void) {
  return useMemo<TableColumnDef<OrganizationRecord>[]>(
    () => [
      { id: "name", label: "名称", defaultWidth: 160, sortKey: "name", render: (o) => o.name },
      {
        id: "phone",
        label: "手机号",
        defaultWidth: 120,
        render: (o) => <span className="font-mono text-xs">{o.phone || "—"}</span>,
      },
      {
        id: "credit_code",
        label: "统一社会信用代码",
        defaultWidth: 180,
        render: (o) => <span className="font-mono text-xs">{o.credit_code || "—"}</span>,
      },
      { id: "org_type", label: "类型", defaultWidth: 100, render: (o) => orgTypeLabel(o.org_type) },
      {
        id: "enabled",
        label: "状态",
        defaultWidth: 80,
        sortKey: "enabled",
        render: (o) => (o.enabled ? "启用" : "禁用"),
      },
      createActionsColumn({
        defaultWidth: 80,
        actionDefs: [{ id: "edit", label: "编辑" }],
        renderItems: (o) => [
          { id: "edit", label: "编辑", permission: "system.org.update", onClick: () => onOpenEdit(o) },
        ],
      }),
    ],
    [onOpenEdit],
  );
}
