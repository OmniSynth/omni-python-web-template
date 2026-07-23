import { cn } from "@/lib/utils";

/** 字段下方内联错误文案（P1）。 */
export function FieldError({ children, className }: { children?: string; className?: string }) {
  if (!children) return null;
  return <p className={cn("mt-1 text-xs text-destructive", className)}>{children}</p>;
}
