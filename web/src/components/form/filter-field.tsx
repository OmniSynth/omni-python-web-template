import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { fieldLabelClass, fieldStackClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

interface FilterFieldProps {
  label: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/** 筛选区字段：宽度由 PageFilterToolbar 行内 grid 控制。 */
export function FilterField({ label, htmlFor, className, children }: FilterFieldProps) {
  return (
    <div className={cn(fieldStackClass, "min-w-0 w-full", className)}>
      <Label htmlFor={htmlFor} className={cn(fieldLabelClass, "block min-h-4 leading-4")}>
        {label}
      </Label>
      {children}
    </div>
  );
}
