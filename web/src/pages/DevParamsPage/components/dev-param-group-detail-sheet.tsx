import { useMemo } from "react";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { mobileTableProps } from "@/components/table/table-mobile-props";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DevParamGroupDetail, DevParamItemView } from "@/types/dev-param";
import { DEFAULT_ROW_HEIGHT, resolveColumns, type TableColumnDef } from "@/types/table-preference";

function formatParamValue(item: DevParamItemView): string {
  if (item.field_type === "password") {
    return item.param_value ? "••••••" : "—";
  }
  return item.param_value || "—";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[6rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}

export function DevParamGroupDetailSheet({
  detail,
  open,
  onOpenChange,
  formatDateTime,
}: {
  detail: DevParamGroupDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatDateTime: (value: string) => string;
}) {
  const columns = useMemo<TableColumnDef<DevParamItemView>[]>(
    () => [
      { id: "param_key", label: "Key", defaultWidth: 180, render: (item) => item.param_key },
      {
        id: "param_value",
        label: "Value",
        defaultWidth: 200,
        render: (item) => formatParamValue(item),
      },
      { id: "remark", label: "备注", defaultWidth: 160, render: (item) => item.remark || "—" },
      {
        id: "updated_at",
        label: "更新时间",
        defaultWidth: 180,
        render: (item) => (item.updated_at ? formatDateTime(item.updated_at) : "—"),
      },
    ],
    [formatDateTime],
  );

  const resolvedColumns = useMemo(
    () => resolveColumns(columns, { version: 1, rowHeight: DEFAULT_ROW_HEIGHT, columns: {} }),
    [columns],
  );

  if (!detail) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>开发参数详情</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <dl className="mb-6 grid gap-3">
            <Row label="名称" value={detail.name} />
            <Row label="描述" value={detail.description} />
            <Row label="创建时间" value={detail.created_at ? formatDateTime(detail.created_at) : ""} />
            <Row label="更新时间" value={detail.updated_at ? formatDateTime(detail.updated_at) : ""} />
            <Row label="创建人" value={detail.created_by_name} />
            <Row label="更新人" value={detail.updated_by_name} />
            <Row label="参数数量" value={String(detail.param_count)} />
          </dl>
          <ConfigurableTable
            minWidth={720}
            rows={detail.params}
            columns={resolvedColumns}
            rowHeight={DEFAULT_ROW_HEIGHT}
            rowKey={(item) => item.param_key}
            emptyMessage="暂无子参数"
            {...mobileTableProps<DevParamItemView>({ titleColumnId: "param_key" })}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
