import * as React from "react";
import { fieldControlClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input type={type} data-slot="input" className={cn(fieldControlClass, className)} ref={ref} {...props} />
  ),
);
Input.displayName = "Input";

export { Input };
