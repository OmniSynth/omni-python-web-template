import { cn } from "@/lib/utils";

/** 无法映射到单字段的区块级错误（P1），如多字段关联校验。 */
export function FormSectionError({ children, className }: { children?: string; className?: string }) {
  if (!children) return null;
  return <p className={cn("text-xs text-destructive", className)}>{children}</p>;
}
