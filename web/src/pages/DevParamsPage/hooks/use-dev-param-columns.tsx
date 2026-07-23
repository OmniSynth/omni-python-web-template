import { useMemo } from "react";
import { createActionsColumn } from "@/components/table/table-row-actions";
import type { DevParamGroupSummary } from "@/types/dev-param";
import type { TableColumnDef } from "@/types/table-preference";

export function useDevParamColumns({
  formatDateTime,
  onEdit,
  onDetail,
}: {
  formatDateTime: (value: string) => string;
  onEdit: (group: DevParamGroupSummary) => void;
  onDetail: (group: DevParamGroupSummary) => void;
}) {
  return useMemo<TableColumnDef<DevParamGroupSummary>[]>(
    () => [
      { id: "name", label: "名称", defaultWidth: 140, sortKey: "name", render: (g) => g.name },
      {
        id: "description",
        label: "描述",
        defaultWidth: 200,
        render: (g) => g.description || "—",
      },
      {
        id: "created_at",
        label: "创建时间",
        defaultWidth: 180,
        sortKey: "created_at",
        render: (g) => (g.created_at ? formatDateTime(g.created_at) : "—"),
      },
      {
        id: "updated_at",
        label: "更新时间",
        defaultWidth: 180,
        sortKey: "updated_at",
        render: (g) => (g.updated_at ? formatDateTime(g.updated_at) : "—"),
      },
      {
        id: "created_by_name",
        label: "创建人",
        defaultWidth: 120,
        render: (g) => g.created_by_name || "—",
      },
      {
        id: "updated_by_name",
        label: "更新人",
        defaultWidth: 120,
        render: (g) => g.updated_by_name || "—",
      },
      {
        id: "param_count",
        label: "参数数量",
        defaultWidth: 100,
        sortKey: "param_count",
        render: (g) => String(g.param_count),
      },
      createActionsColumn({
        defaultWidth: 120,
        actionDefs: [
          { id: "edit", label: "编辑" },
          { id: "detail", label: "详情" },
        ],
        renderItems: (g) => [
          { id: "edit", label: "编辑", permission: "dev_param.update", onClick: () => onEdit(g) },
          { id: "detail", label: "详情", permission: "dev_param.list", onClick: () => onDetail(g) },
        ],
      }),
    ],
    [formatDateTime, onEdit, onDetail],
  );
}
