import { resolveColumnPixelWidth } from "@/types/table-preference";

/** 固定列宽：表头/表体双表共用同一 colgroup。 */
export function TableColumnGroup({
  columns,
}: {
  columns: Array<{ id: string; width?: number; defaultWidth?: number }>;
}) {
  return (
    <colgroup>
      {columns.map((col) => (
        <col key={col.id} style={{ width: resolveColumnPixelWidth(col.width, col.defaultWidth) }} />
      ))}
    </colgroup>
  );
}
