import type { ReactNode } from "react";
import { PageHeaderActionsRow } from "@/components/layout/page-header-actions-row";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PageTableScrollProvider } from "@/contexts/PageTableScrollContext";
import { cn } from "@/lib/utils";

/** 单页根容器：与顶栏/侧栏衔接的连续内容平面。 */
export function Page({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-1 flex-col bg-transparent">{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-normal tracking-tight text-primary sm:text-xl">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 hidden truncate text-sm text-muted-foreground sm:block">{subtitle}</p>
        ) : null}
      </div>
      {action ? <PageHeaderActionsRow className="w-auto max-w-[55%] sm:max-w-none">{action}</PageHeaderActionsRow> : null}
    </header>
  );
}

type PageBodyLayout = "scroll" | "table" | "panels";

export function PageBody({
  children,
  className,
  layout = "scroll",
}: {
  children: ReactNode;
  className?: string;
  layout?: PageBodyLayout;
}) {
  if (layout === "table") {
    return (
      <PageTableScrollProvider>
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none bg-transparent", className)}>
          {children}
        </div>
      </PageTableScrollProvider>
    );
  }

  if (layout === "panels") {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent", className)}>{children}</div>
    );
  }

  return (
    <ScrollArea className={cn("min-h-0 flex-1 overscroll-none bg-transparent", className)}>
      <main className="flex flex-col">{children}</main>
      <ScrollBar />
    </ScrollArea>
  );
}

/** 内容区分段：仅底部分割线，无卡片边框。 */
export function PageSection({
  title,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("border-b border-border last:border-b-0", className)}>
      {title ? (
        <div className="border-b border-border/60 px-6 py-3">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
        </div>
      ) : null}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}

/** 工具栏行：筛选、Tab 等，与正文同一平面。 */
export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:flex-wrap sm:items-end",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageMessage({ children, variant = "error" }: { children: ReactNode; variant?: "error" | "info" }) {
  return (
    <p
      className={cn(
        "border-b border-border px-6 py-3 text-sm",
        variant === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

export function PageFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-end gap-2 border-t border-border px-6 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
