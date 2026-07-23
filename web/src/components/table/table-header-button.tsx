import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TableHeaderButtonProps = ComponentProps<typeof Button> & {
  /** lg 以下显示的短文案；省略时与 children 相同。 */
  mobileLabel?: ReactNode;
};

/** 页头操作按钮：桌面完整文案，手机端短文案。 */
export function TableHeaderButton({ children, mobileLabel, className, ...props }: TableHeaderButtonProps) {
  const compact = mobileLabel ?? children;

  return (
    <Button className={cn("shrink-0", className)} {...props}>
      <span className="lg:hidden">{compact}</span>
      <span className="hidden lg:inline">{children}</span>
    </Button>
  );
}
