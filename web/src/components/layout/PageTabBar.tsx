import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PageTabItem {
  value: string;
  label: string;
}

/** 页内 Tab 导航栏：下划线指示，禁止主色实心按钮样式。 */
export function PageTabBar({
  value,
  onValueChange,
  tabs,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: PageTabItem[];
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 border-b border-border px-3 sm:px-6", className)}>
      <Tabs value={value} onValueChange={onValueChange}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="page-tab-trigger shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-3 py-3 text-sm font-medium text-muted-foreground shadow-none sm:px-4 data-active:border-transparent data-active:bg-transparent data-active:text-foreground data-active:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Tabs>
    </div>
  );
}
