import { GripVertical } from "lucide-react";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  mergeActionOrder,
  TABLE_ACTION_INLINE_VISIBLE_MAX_DEFAULT,
  type TableActionDef,
} from "@/types/table-preference";

const orderLinkButtonClass = "h-auto min-h-0 shrink-0 min-w-0 px-1 py-0 text-xs font-normal whitespace-nowrap";

interface TableActionOrderSettingsProps {
  actionDefs: TableActionDef[];
  actionOrder: string[] | undefined;
  actionInlineVisibleMax: number | undefined;
  onReorder: (orderedIds: string[]) => void;
  onInlineVisibleMaxChange: (value: number | undefined) => void;
}

function formatInlineVisibleHint(inlineMax: number): string {
  const foldThreshold = inlineMax + 1;
  return `总数 ≤ ${foldThreshold} 时全部直接显示；超过 ${foldThreshold} 个时，前 ${inlineMax} 个直接显示，第 ${inlineMax + 1} 个及之后收入「更多」`;
}

/** 操作列按钮排序与直显个数（写入列偏好 actionOrder / actionInlineVisibleMax）。 */
export function TableActionOrderSettings({
  actionDefs,
  actionOrder,
  actionInlineVisibleMax,
  onReorder,
  onInlineVisibleMaxChange,
}: TableActionOrderSettingsProps) {
  const defaultIds = actionDefs.map((def) => def.id);
  const orderedIds = mergeActionOrder(actionOrder, defaultIds);
  const labelById = new Map(actionDefs.map((def) => [def.id, def.label]));
  const inlineMax = actionInlineVisibleMax ?? TABLE_ACTION_INLINE_VISIBLE_MAX_DEFAULT;

  function move(id: string, action: "top" | "up" | "down" | "bottom") {
    const index = orderedIds.indexOf(id);
    if (index < 0) return;
    const next = [...orderedIds];
    if (action === "top") {
      next.splice(index, 1);
      next.unshift(id);
    } else if (action === "bottom") {
      next.splice(index, 1);
      next.push(id);
    } else if (action === "up" && index > 0) {
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
    } else if (action === "down" && index < next.length - 1) {
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
    } else {
      return;
    }
    onReorder(next);
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <FormField label="直接显示按钮数" htmlFor="action-inline-visible-max">
        <Input
          id="action-inline-visible-max"
          type="number"
          min={1}
          max={9}
          placeholder={String(TABLE_ACTION_INLINE_VISIBLE_MAX_DEFAULT)}
          value={actionInlineVisibleMax ?? ""}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) {
              onInlineVisibleMaxChange(undefined);
              return;
            }
            const parsed = Number(raw);
            onInlineVisibleMaxChange(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
          }}
        />
      </FormField>
      <p className="text-xs font-medium text-muted-foreground">操作按钮排序</p>
      <div className="space-y-2">
        {orderedIds.map((id, index) => {
          const label = labelById.get(id) ?? id;
          const isFirst = index === 0;
          const isLast = index === orderedIds.length - 1;
          return (
            <div key={id} className="surface-glass flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
              <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
              <div className="flex shrink-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className={orderLinkButtonClass}
                  disabled={isFirst}
                  onClick={() => move(id, "top")}
                >
                  置顶
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className={orderLinkButtonClass}
                  disabled={isFirst}
                  onClick={() => move(id, "up")}
                >
                  上移
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className={orderLinkButtonClass}
                  disabled={isLast}
                  onClick={() => move(id, "down")}
                >
                  下移
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  className={orderLinkButtonClass}
                  disabled={isLast}
                  onClick={() => move(id, "bottom")}
                >
                  置底
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{formatInlineVisibleHint(inlineMax)}</p>
    </div>
  );
}
