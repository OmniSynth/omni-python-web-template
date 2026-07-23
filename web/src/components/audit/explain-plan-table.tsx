import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { SqlExplainResult } from "@/types/audit";

interface ExplainPlanSummaryProps {
  summary: NonNullable<SqlExplainResult["summary"]>;
}

export function ExplainPlanSummary({ summary }: ExplainPlanSummaryProps) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-md bg-muted px-2 py-0.5">扫描行数上限：{summary.max_rows_examined ?? "—"}</span>
      <span
        className={`rounded-md px-2 py-0.5 ${summary.uses_index ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400"}`}
      >
        {summary.uses_index ? "使用索引" : "未命中索引"}
      </span>
      {summary.warnings.map((w) => (
        <span key={w} className="rounded-md bg-destructive/10 px-2 py-0.5 text-destructive">
          {w}
        </span>
      ))}
    </div>
  );
}

interface ExplainPlanTableProps {
  plan: NonNullable<SqlExplainResult["plan"]>;
}

export function ExplainPlanTable({ plan }: ExplainPlanTableProps) {
  const columns =
    plan.length > 0 ? Object.keys(plan[0]).filter((k) => plan[0][k] !== null && plan[0][k] !== undefined) : [];

  if (plan.length === 0) {
    return <p className="text-muted-foreground text-xs">无执行计划行</p>;
  }

  return (
    <ScrollArea className="max-h-52 rounded-md border">
      <table className="w-full min-w-160 text-xs">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-2 py-1.5 text-left font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.map((row, idx) => (
            <tr key={idx} className="border-t border-border/60">
              {columns.map((col) => (
                <td key={col} className="px-2 py-1.5 font-mono whitespace-nowrap">
                  {row[col] == null ? "—" : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
