import { MoreHorizontal } from "lucide-react";
import { type ButtonHTMLAttributes, createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  ACTION_COLUMN_ID,
  resolveOrderedTableActionItems,
  splitTableActionItems,
  type TableActionDef,
  type TableActionItem,
  type TableColumnDef,
  type TableColumnPreference,
} from "@/types/table-preference";

const actionLinkClassName =
  "text-primary hover:underline disabled:pointer-events-none disabled:opacity-50 disabled:no-underline";

type TableActionColumnPref = Pick<TableColumnPreference, "actionOrder" | "actionInlineVisibleMax">;

const TableActionColumnPrefContext = createContext<TableActionColumnPref | undefined>(undefined);

export function TableActionOrderProvider({
  actionOrder,
  actionInlineVisibleMax,
  actionsColumnPref,
  children,
}: {
  /** @deprecated 请改用 actionsColumnPref */
  actionOrder?: string[];
  /** @deprecated 请改用 actionsColumnPref */
  actionInlineVisibleMax?: number;
  actionsColumnPref?: TableActionColumnPref;
  children: ReactNode;
}) {
  const value = useMemo<TableActionColumnPref>(
    () =>
      actionsColumnPref ?? {
        actionOrder,
        actionInlineVisibleMax,
      },
    [actionInlineVisibleMax, actionOrder, actionsColumnPref],
  );
  return <TableActionColumnPrefContext.Provider value={value}>{children}</TableActionColumnPrefContext.Provider>;
}

function useTableActionColumnPref(): TableActionColumnPref {
  return useContext(TableActionColumnPrefContext) ?? {};
}

/** 操作列 link 按钮。 */
export function TableActionLink({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn(actionLinkClassName, className)} {...props}>
      {children}
    </button>
  );
}

function ActionLinkButton({ item }: { item: TableActionItem }) {
  return (
    <TableActionLink disabled={item.disabled} onClick={item.onClick}>
      {item.label}
    </TableActionLink>
  );
}

function TableActionOverflowMenu({ items }: { items: TableActionItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(actionLinkClassName, "inline-flex items-center gap-0.5")}
        aria-label="更多操作"
      >
        更多
        <MoreHorizontal className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-auto min-w-28 p-1">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              className={cn(
                "rounded-sm px-2 py-1.5 text-left text-sm text-primary hover:bg-muted disabled:opacity-50",
                "hover:underline disabled:no-underline disabled:hover:bg-transparent",
              )}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** 操作列：总数 ≤ 直显数 + 1 时全部展示，否则前 N 个直显、其余收入「更多」。 */
export function TableRowActions({
  items,
  className,
  variant = "table",
}: {
  items: TableActionItem[];
  className?: string;
  /** mobile：单行右对齐，不换行；table：桌面表格单元格内可换行 */
  variant?: "table" | "mobile";
}) {
  const { hasPermission } = useAuth();
  const { actionOrder, actionInlineVisibleMax } = useTableActionColumnPref();

  const ordered = useMemo(() => {
    const permitted = items.filter((item) => !item.hidden && (!item.permission || hasPermission(item.permission)));
    return resolveOrderedTableActionItems(permitted, actionOrder);
  }, [actionOrder, hasPermission, items]);

  if (ordered.length === 0) return null;

  const { inline, folded } = splitTableActionItems(ordered, actionInlineVisibleMax);

  return (
    <div
      className={cn(
        variant === "mobile"
          ? "flex flex-nowrap items-center justify-end gap-x-3 overflow-x-auto [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden"
          : "flex flex-wrap items-center gap-x-3 gap-y-1",
        className,
      )}
    >
      {inline.map((item) => (
        <ActionLinkButton key={item.id} item={item} />
      ))}
      {folded.length > 0 ? <TableActionOverflowMenu items={folded} /> : null}
    </div>
  );
}

/** 声明式操作列定义。 */
export function createActionsColumn<T>(options: {
  label?: string;
  defaultWidth?: number;
  actionDefs: TableActionDef[];
  renderItems: (row: T) => TableActionItem[];
}): TableColumnDef<T> {
  return {
    id: ACTION_COLUMN_ID,
    label: options.label ?? "操作",
    defaultWidth: options.defaultWidth ?? 120,
    pinRight: true,
    actionDefs: options.actionDefs,
    resolveActionItems: options.renderItems,
    render: (row) => <TableRowActions items={options.renderItems(row)} />,
  };
}
