import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActionColumn, type ResolvedTableColumn, type TableSortPreference } from "@/types/table-preference";

type TableMobileSortBarProps<T> = {
  columns: ResolvedTableColumn<T>[];
  sort?: TableSortPreference | null;
  onSort?: (columnId: string) => void;
};

/** 手机端排序栏：展示可排序字段，与桌面列头排序状态同步。 */
export function TableMobileSortBar<T>({ columns, sort, onSort }: TableMobileSortBarProps<T>) {
  const sortableColumns = columns.filter((col) => col.visible !== false && !isActionColumn(col) && col.sortKey);

  if (!onSort || sortableColumns.length === 0) return null;

  return (
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 py-2 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
      {sortableColumns.map((col) => {
        const active = sort?.columnId === col.id;
        const order = active ? sort?.order : undefined;

        return (
          <button
            key={col.id}
            type="button"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-muted text-muted-foreground hover:bg-secondary",
            )}
            onClick={() => onSort(col.id)}
          >
            <span className="max-w-32 truncate">{col.label}</span>
            {active ? (
              order === "asc" ? (
                <ArrowUp className="size-3.5 shrink-0" />
              ) : (
                <ArrowDown className="size-3.5 shrink-0" />
              )
            ) : (
              <ArrowUpDown className="size-3.5 shrink-0 opacity-40" />
            )}
          </button>
        );
      })}
    </div>
  );
}
