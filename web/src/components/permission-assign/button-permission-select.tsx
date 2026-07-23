import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ButtonOption } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface ButtonPermissionSelectProps {
  options: ButtonOption[];
  selected: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
  emptyHint?: string;
}

/** 当前菜单下按钮权限平铺多选（权限分配唯一入口，禁止下拉模式）。 */
export function ButtonPermissionSelect({
  options,
  selected,
  onChange,
  disabled = false,
  emptyHint = "暂无按钮权限",
}: ButtonPermissionSelectProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(code: string, checked: boolean) {
    onChange(checked ? [...selected, code] : selected.filter((item) => item !== code));
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((item) => {
        const inputId = `btn-perm-${item.code}`;
        return (
          <div
            key={item.code}
            className={cn(
              "surface-glass flex items-start gap-2 rounded-md border p-2 text-sm hover:bg-muted/40",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Checkbox
              id={inputId}
              className="mt-0.5 shrink-0"
              disabled={disabled}
              checked={selectedSet.has(item.code)}
              onCheckedChange={(next) => toggle(item.code, next === true)}
            />
            <Label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer font-normal">
              <span className="block truncate">{item.name}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">{item.code}</span>
            </Label>
          </div>
        );
      })}
    </div>
  );
}
