import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 手机端页头操作区：单行不换行，超出横向滚动；桌面端允许换行。 */
export const pageHeaderActionsRowClass =
  "flex w-full min-w-0 shrink-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible";

type PageHeaderActionsRowProps = {
  children: ReactNode;
  className?: string;
};

export function PageHeaderActionsRow({ children, className }: PageHeaderActionsRowProps) {
  return <div className={cn(pageHeaderActionsRowClass, className)}>{children}</div>;
}
