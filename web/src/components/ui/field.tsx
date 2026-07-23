import type * as React from "react";
import { Label } from "@/components/ui/label";
import { fieldStackClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("grid gap-4", className)} {...props} />;
}

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field" className={cn(fieldStackClass, className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={className} {...props} />;
}

export { Field, FieldGroup, FieldLabel };
