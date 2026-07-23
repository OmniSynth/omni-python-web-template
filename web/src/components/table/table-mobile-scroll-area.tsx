import { type ReactNode, useLayoutEffect, useRef } from "react";
import { TableMobileInfiniteFooter } from "@/components/table/table-mobile-infinite-footer";
import type { TableMobileInfiniteScrollProps } from "@/components/table/table-mobile-infinite-scroll";
import { shouldTriggerMobileLoadMore } from "@/components/table/table-mobile-infinite-scroll";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMobileScrollLoadMore } from "@/hooks/use-mobile-scroll-load-more";
import { useMobileTableViewport } from "@/hooks/use-mobile-table-viewport";

type TableMobileScrollAreaProps = {
  children: ReactNode;
  infiniteScroll?: TableMobileInfiniteScrollProps;
  total?: number;
};

/** 手机端表格滚动区：接近底部时加载下一页。 */
export function TableMobileScrollArea({ children, infiniteScroll, total }: TableMobileScrollAreaProps) {
  const isMobileViewport = useMobileTableViewport();
  const rootRef = useRef<HTMLDivElement>(null);
  const activeInfiniteScroll = isMobileViewport ? infiniteScroll : undefined;
  const handleViewportScroll = useMobileScrollLoadMore(activeInfiniteScroll);

  useLayoutEffect(() => {
    if (!isMobileViewport || !infiniteScroll?.hasMore || infiniteScroll.loading) return;
    const viewport = rootRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;
    if (shouldTriggerMobileLoadMore(viewport, 0)) {
      infiniteScroll.onLoadMore();
    }
  }, [infiniteScroll, isMobileViewport]);

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1" onViewportScroll={handleViewportScroll}>
        {children}
        {activeInfiniteScroll ? (
          <TableMobileInfiniteFooter
            loading={activeInfiniteScroll.loading}
            hasMore={activeInfiniteScroll.hasMore}
            loadedCount={activeInfiniteScroll.loadedCount}
            total={total}
          />
        ) : null}
        <ScrollBar />
      </ScrollArea>
    </div>
  );
}
