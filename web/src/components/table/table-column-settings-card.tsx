import { FormField } from "@/components/form/form-field";
import { TableActionOrderSettings } from "@/components/table/table-action-order-settings";
import { TableColumnSettingsCardHeader } from "@/components/table/table-column-settings-card-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  isActionColumn,
  type TableColumnDef,
  type TableColumnPreference,
  type TablePreferenceConfig,
} from "@/types/table-preference";

interface TableColumnSettingsCardProps<T> {
  def: TableColumnDef<T>;
  pref: TableColumnPreference | undefined;
  columnIndex: number;
  columnCount: number;
  isDragging: boolean;
  onUpdateColumn: (columnId: string, patch: Partial<TablePreferenceConfig["columns"][string]>) => void;
  onResetColumn: (columnId: string) => void;
  onStartDrag: (event: React.PointerEvent<HTMLButtonElement>, id: string) => void;
  onMoveByKeyboard: (id: string, direction: -1 | 1) => void;
  onMoveColumn: (id: string, action: "top" | "up" | "down" | "bottom") => void;
}

/** 单列字段配置卡片。 */
export function TableColumnSettingsCard<T>({
  def,
  pref,
  columnIndex,
  columnCount,
  isDragging,
  onUpdateColumn,
  onResetColumn,
  onStartDrag,
  onMoveByKeyboard,
  onMoveColumn,
}: TableColumnSettingsCardProps<T>) {
  const actionColumn = isActionColumn(def);
  const isVisible = pref?.visible !== false;
  const displayLabel = pref?.label?.trim() || def.label;

  return (
    <div
      data-column-id={def.id}
      className={cn(
        "rounded-lg border border-border/70 bg-field/80 p-3",
        isDragging && "border-dashed border-primary/60 opacity-30",
      )}
    >
      <TableColumnSettingsCardHeader
        def={def}
        pref={pref}
        columnIndex={columnIndex}
        columnCount={columnCount}
        isDragging={isDragging}
        actionColumn={actionColumn}
        displayLabel={displayLabel}
        isVisible={isVisible}
        onUpdateColumn={onUpdateColumn}
        onStartDrag={onStartDrag}
        onMoveByKeyboard={onMoveByKeyboard}
        onMoveColumn={onMoveColumn}
      />
      <div className="grid gap-2">
        <FormField label="列名" htmlFor={`label-${def.id}`}>
          <Input
            id={`label-${def.id}`}
            placeholder={def.label}
            value={pref?.label ?? ""}
            onChange={(e) => onUpdateColumn(def.id, { label: e.target.value || undefined })}
          />
        </FormField>
        <FormField label="列宽（px）" htmlFor={`width-${def.id}`}>
          <Input
            id={`width-${def.id}`}
            type="number"
            min={40}
            placeholder={def.defaultWidth ? String(def.defaultWidth) : undefined}
            value={pref?.width ?? ""}
            onChange={(e) => {
              const n = Number(e.target.value);
              onUpdateColumn(def.id, {
                width: Number.isFinite(n) && n > 0 ? n : undefined,
              });
            }}
          />
        </FormField>
        <FormField label="提示 Tips" htmlFor={`tip-${def.id}`}>
          <Input
            id={`tip-${def.id}`}
            placeholder={def.defaultTip ?? ""}
            value={pref?.tip ?? ""}
            onChange={(e) => onUpdateColumn(def.id, { tip: e.target.value || undefined })}
          />
        </FormField>
        {actionColumn && def.actionDefs?.length ? (
          <TableActionOrderSettings
            actionDefs={def.actionDefs}
            actionOrder={pref?.actionOrder}
            actionInlineVisibleMax={pref?.actionInlineVisibleMax}
            onReorder={(orderedIds) => onUpdateColumn(def.id, { actionOrder: orderedIds })}
            onInlineVisibleMaxChange={(value) => onUpdateColumn(def.id, { actionInlineVisibleMax: value })}
          />
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={() => onResetColumn(def.id)}>
          还原此列
        </Button>
      </div>
    </div>
  );
}
