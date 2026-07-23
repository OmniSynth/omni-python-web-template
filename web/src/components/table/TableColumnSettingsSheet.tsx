import { useMemo, useState } from "react";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  isSettingsEditableColumn,
  matchTableColumnKeyword,
  type TableColumnDef,
  type TablePreferenceConfig,
} from "@/types/table-preference";
import { TableColumnSettingsCard } from "./table-column-settings-card";
import { useTableColumnDragReorder } from "./use-table-column-drag-reorder";

interface TableColumnSettingsSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 与 PageHeader 或表格区块标题一致。 */
  title: string;
  /** 页内 Tab 等次级标题；无 Tab 时可省略。 */
  subtitle?: string;
  config: TablePreferenceConfig;
  defaultColumns: TableColumnDef<T>[];
  onUpdateColumn: (columnId: string, patch: Partial<TablePreferenceConfig["columns"][string]>) => void;
  onReorder: (orderedIds: string[]) => void;
  onSetRowHeight: (height: number) => void;
  onResetColumn: (columnId: string) => void;
  onResetAll: () => void;
}

/** 表格字段自定义抽屉。 */
export function TableColumnSettingsSheet<T>({
  open,
  onOpenChange,
  title,
  subtitle,
  config,
  defaultColumns,
  onUpdateColumn,
  onReorder,
  onSetRowHeight,
  onResetColumn,
  onResetAll,
}: TableColumnSettingsSheetProps<T>) {
  const [keyword, setKeyword] = useState("");

  const editableColumns = useMemo(
    () =>
      defaultColumns
        .filter((col) => isSettingsEditableColumn(col as TableColumnDef<unknown>))
        .map((col) => ({
          def: col,
          pref: config.columns[col.id],
        }))
        .sort((a, b) => (a.pref?.order ?? 0) - (b.pref?.order ?? 0)),
    [config.columns, defaultColumns],
  );

  const filteredColumns = useMemo(
    () => editableColumns.filter(({ def, pref }) => matchTableColumnKeyword(def, pref, keyword)),
    [editableColumns, keyword],
  );

  const drag = useTableColumnDragReorder(editableColumns, onReorder, defaultColumns);

  const renderedColumns = keyword.trim()
    ? filteredColumns
    : drag.renderedColumns.filter(({ def }) => filteredColumns.some((item) => item.def.id === def.id));

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setKeyword("");
        onOpenChange(next);
      }}
    >
      <SheetContent side="right" className="p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <SheetBody className="space-y-4">
          <FormField label="行高（px）" htmlFor="table-row-height">
            <Input
              id="table-row-height"
              type="number"
              min={24}
              max={120}
              value={config.rowHeight}
              onChange={(e) => onSetRowHeight(Number(e.target.value) || 36)}
            />
          </FormField>

          <FormField label="搜索字段" htmlFor="table-column-keyword">
            <Input
              id="table-column-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="模糊匹配列名或字段 id"
            />
          </FormField>

          <div ref={drag.listRef} className="space-y-3">
            {renderedColumns.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">无匹配字段</p>
            ) : (
              renderedColumns.map(({ def, pref }) => {
                const columnIndex = editableColumns.findIndex((item) => item.def.id === def.id);
                return (
                  <TableColumnSettingsCard
                    key={def.id}
                    def={def}
                    pref={pref}
                    columnIndex={columnIndex}
                    columnCount={editableColumns.length}
                    isDragging={drag.dragId === def.id}
                    onUpdateColumn={onUpdateColumn}
                    onResetColumn={onResetColumn}
                    onStartDrag={drag.startDrag}
                    onMoveByKeyboard={drag.moveByKeyboard}
                    onMoveColumn={drag.moveColumn}
                  />
                );
              })
            )}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="secondary" onClick={() => onResetAll()}>
            全部还原
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            完成
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
