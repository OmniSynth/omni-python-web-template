import type * as React from "react";
import { fieldTextareaClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldTextareaClass, className)} {...props} />;
}

export { Textarea };
