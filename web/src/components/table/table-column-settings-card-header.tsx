import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  defaultColumnPinRight,
  type TableColumnDef,
  type TableColumnPreference,
  type TablePreferenceConfig,
} from "@/types/table-preference";

const orderLinkButtonClass = "h-auto min-h-0 shrink-0 min-w-0 px-1 py-0 text-xs font-normal whitespace-nowrap";

type TableColumnSettingsCardHeaderProps<T> = {
  def: TableColumnDef<T>;
  pref: TableColumnPreference | undefined;
  columnIndex: number;
  columnCount: number;
  isDragging: boolean;
  actionColumn: boolean;
  displayLabel: string;
  isVisible: boolean;
  onUpdateColumn: (columnId: string, patch: Partial<TablePreferenceConfig["columns"][string]>) => void;
  onStartDrag: (event: React.PointerEvent<HTMLButtonElement>, id: string) => void;
  onMoveByKeyboard: (id: string, direction: -1 | 1) => void;
  onMoveColumn: (id: string, action: "top" | "up" | "down" | "bottom") => void;
};

export function TableColumnSettingsCardHeader<T>({
  def,
  pref,
  columnIndex,
  columnCount,
  isDragging,
  actionColumn,
  displayLabel,
  isVisible,
  onUpdateColumn,
  onStartDrag,
  onMoveByKeyboard,
  onMoveColumn,
}: TableColumnSettingsCardHeaderProps<T>) {
  const isFirst = columnIndex === 0;
  const isLast = columnIndex === columnCount - 1;
  const pinRightChecked = pref?.pinRight ?? defaultColumnPinRight(def);

  return (
    <div className="mb-2 flex items-center gap-2">
      <button
        type="button"
        disabled={actionColumn}
        className={cn(
          "flex size-8 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground transition-colors",
          actionColumn
            ? "cursor-not-allowed opacity-40"
            : "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing",
        )}
        aria-label={`拖动${displayLabel}调整顺序`}
        aria-grabbed={isDragging}
        onPointerDown={(event) => onStartDrag(event, def.id)}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          onMoveByKeyboard(def.id, event.key === "ArrowUp" ? -1 : 1);
        }}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{displayLabel}</span>
      <div className="flex max-w-[min(72vw,28rem)] shrink-0 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
        {!actionColumn ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="link"
              size="xs"
              className={orderLinkButtonClass}
              disabled={isFirst}
              onClick={() => onMoveColumn(def.id, "top")}
            >
              置顶
            </Button>
            <Button
              type="button"
              variant="link"
              size="xs"
              className={orderLinkButtonClass}
              disabled={isFirst}
              onClick={() => onMoveColumn(def.id, "up")}
            >
              上移
            </Button>
            <Button
              type="button"
              variant="link"
              size="xs"
              className={orderLinkButtonClass}
              disabled={isLast}
              onClick={() => onMoveColumn(def.id, "down")}
            >
              下移
            </Button>
            <Button
              type="button"
              variant="link"
              size="xs"
              className={orderLinkButtonClass}
              disabled={isLast}
              onClick={() => onMoveColumn(def.id, "bottom")}
            >
              置底
            </Button>
          </div>
        ) : null}
        {actionColumn ? (
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Checkbox
              id={`pin-right-${def.id}`}
              checked={pinRightChecked}
              disabled={!isVisible}
              onCheckedChange={(checked) => onUpdateColumn(def.id, { pinRight: checked === true })}
            />
            <Label htmlFor={`pin-right-${def.id}`} className="text-xs font-normal">
              右侧固定
            </Label>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Checkbox
              id={`pinned-${def.id}`}
              checked={pref?.pinned === true}
              disabled={!isVisible}
              onCheckedChange={(checked) => onUpdateColumn(def.id, { pinned: checked === true })}
            />
            <Label htmlFor={`pinned-${def.id}`} className="text-xs font-normal">
              固定
            </Label>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <Checkbox
            id={`visible-${def.id}`}
            checked={isVisible}
            onCheckedChange={(checked) =>
              onUpdateColumn(def.id, {
                visible: checked === true,
                ...(checked === false ? { pinned: false, pinRight: false } : {}),
              })
            }
          />
          <Label htmlFor={`visible-${def.id}`} className="text-xs font-normal">
            显示
          </Label>
        </div>
      </div>
    </div>
  );
}
