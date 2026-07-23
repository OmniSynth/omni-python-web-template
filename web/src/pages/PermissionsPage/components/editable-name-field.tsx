import { Check, Pencil, X } from "lucide-react";
import { TableActionLink } from "@/components/table/table-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditableNameFieldProps } from "../types";

export function EditableNameField({
  record,
  editing,
  draftName,
  nameFocused,
  canUpdate,
  inputRef,
  titleClassName = "text-lg font-medium",
  onStartEdit,
  onDraftChange,
  onFocus,
  onBlur,
  onCancel,
  onSave,
}: EditableNameFieldProps) {
  if (editing) {
    return (
      <div className="grid gap-2">
        {(nameFocused || draftName.trim() !== record.name) && (
          <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div className="grid gap-0.5">
              <p className="font-medium text-foreground">确认修改名称？</p>
              <p>保存后会立即更新当前权限名称。</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="取消"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onCancel}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                aria-label="保存"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onSave}
                disabled={!draftName.trim() || draftName.trim() === record.name}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        <Input
          ref={inputRef}
          value={draftName}
          className={titleClassName}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSave();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className={titleClassName}>{record.name}</p>
        <p className="break-all font-mono text-xs text-muted-foreground">{record.code}</p>
      </div>
      {canUpdate ? (
        <TableActionLink className="shrink-0 pt-0.5" onClick={onStartEdit}>
          <span className="inline-flex items-center gap-1">
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </span>
        </TableActionLink>
      ) : null}
    </div>
  );
}
