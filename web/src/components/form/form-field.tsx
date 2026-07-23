import type { ReactNode } from "react";
import { FieldError } from "@/components/form/field-error";
import { RequiredMark } from "@/components/form/required-mark";
import { Label } from "@/components/ui/label";
import { fieldStackClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** 标准表单字段：Label + 必填标记 + 控件 + 内联错误。 */
export function FormField({ label, htmlFor, required = false, error, className, children }: FormFieldProps) {
  return (
    <div className={cn(fieldStackClass, className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}
