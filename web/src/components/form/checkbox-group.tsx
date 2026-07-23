import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CheckboxGroupItem {
  id: string;
  label: ReactNode;
  value: string | number;
  disabled?: boolean;
}

interface CheckboxGroupProps {
  items: CheckboxGroupItem[];
  selected: Array<string | number>;
  onChange: (selected: Array<string | number>) => void;
  layout?: "vertical" | "grid";
  className?: string;
}

/** 复选框组：统一 Checkbox + Label 布局。 */
export function CheckboxGroup({ items, selected, onChange, layout = "vertical", className }: CheckboxGroupProps) {
  const selectedSet = new Set(selected.map(String));

  function toggle(value: string | number, checked: boolean) {
    const key = String(value);
    if (checked) {
      onChange([...selected, value]);
    } else {
      onChange(selected.filter((v) => String(v) !== key));
    }
  }

  return (
    <div className={cn(layout === "grid" ? "grid gap-2 sm:grid-cols-2" : "grid gap-2", className)}>
      {items.map((item) => {
        const inputId = item.id;
        const checked = selectedSet.has(String(item.value));
        return (
          <div key={inputId} className="flex items-center gap-2">
            <Checkbox
              id={inputId}
              checked={checked}
              disabled={item.disabled}
              onCheckedChange={(next) => toggle(item.value, next === true)}
            />
            <Label htmlFor={inputId} className="cursor-pointer font-normal text-foreground">
              {item.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
