import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { TableHead } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SortOrder, TableSortPreference } from "@/types/table-preference";

interface SortableTableHeadProps {
  label: string;
  tip?: string;
  sortable?: boolean;
  sort?: TableSortPreference | null;
  columnId: string;
  className?: string;
  style?: CSSProperties;
  onSort?: () => void;
  /** PC 端列宽拖拽；有回调时显示右边缘手柄 */
  resizable?: boolean;
  onResizeStart?: (event: ReactPointerEvent) => void;
}

/** 可排序列头，支持悬停 Tips、排序指示与 PC 端拖拽调宽。 */
export function SortableTableHead({
  label,
  tip,
  sortable = false,
  sort,
  columnId,
  className,
  style,
  onSort,
  resizable = false,
  onResizeStart,
}: SortableTableHeadProps) {
  const active = sort?.columnId === columnId;
  const order: SortOrder | undefined = active ? sort?.order : undefined;
  const tipText = tip?.trim();

  const labelRow = (
    <span className="inline-flex min-w-0 items-center gap-1 pr-1.5">
      <span className="truncate">{label}</span>
      {sortable ? (
        active ? (
          order === "asc" ? (
            <ArrowUp className="size-3.5 shrink-0" />
          ) : (
            <ArrowDown className="size-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 shrink-0 opacity-40" />
        )
      ) : null}
    </span>
  );

  const resizeHandle = resizable ? (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`调整「${label}」列宽`}
      className={cn(
        "group/resize absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize touch-none",
        "hover:bg-primary/15 active:bg-primary/30",
      )}
      onPointerDown={onResizeStart}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-2 right-0 w-px bg-border/60",
          "group-hover/resize:bg-primary/40 group-active/resize:bg-primary/55",
        )}
      />
    </div>
  ) : null;

  if (tipText) {
    return (
      <TableHead className={cn("relative", sortable && "select-none", className)} style={style}>
        <Tooltip>
          <TooltipTrigger
            render={
              <div
                className={cn(
                  "inline-flex w-full min-w-0 items-center text-left",
                  sortable && "cursor-pointer hover:text-foreground",
                )}
                onClick={sortable ? onSort : undefined}
              />
            }
          >
            {labelRow}
          </TooltipTrigger>
          <TooltipContent>{tipText}</TooltipContent>
        </Tooltip>
        {resizeHandle}
      </TableHead>
    );
  }

  return (
    <TableHead
      className={cn("relative", sortable && "cursor-pointer select-none hover:text-foreground", className)}
      style={style}
      onClick={sortable ? onSort : undefined}
    >
      {labelRow}
      {resizeHandle}
    </TableHead>
  );
}
