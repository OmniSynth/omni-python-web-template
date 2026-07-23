import type * as React from "react";
import { fieldLabelClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn(fieldLabelClass, className)} {...props} />;
}

export { Label };
