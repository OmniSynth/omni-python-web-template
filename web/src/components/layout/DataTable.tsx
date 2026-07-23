import { type ReactNode, type UIEvent, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table } from "@/components/ui/table";
import { useOptionalPageTableScroll } from "@/contexts/PageTableScrollContext";
import { cn } from "@/lib/utils";

interface DataTableProps {
  tableWidth: number;
  columnGroup: ReactNode;
  header: ReactNode;
  body: ReactNode;
  className?: string;
  /** 容器内容区宽度变化（用于列宽按比例铺满） */
  onContainerWidthChange?: (width: number) => void;
}

const tableLayoutClassName = "table-fixed max-w-none border-collapse bg-transparent";

/** 表格数据区：表头固定于滚动区外，仅 tbody 滚动；横向滚动与表头同步。 */
export function DataTable({
  tableWidth,
  columnGroup,
  header,
  body,
  className,
  onContainerWidthChange,
}: DataTableProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const scrollCtx = useOptionalPageTableScroll();

  /** 表宽 = 各列显示宽之和（不足容器时已按比例放大至铺满；超出则横向滚动）。 */
  const tableStyle = { width: tableWidth, minWidth: tableWidth };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !onContainerWidthChange) return;
    const notify = () => {
      onContainerWidthChange(Math.max(0, Math.floor(root.clientWidth)));
    };
    notify();
    const observer = new ResizeObserver(() => notify());
    observer.observe(root);
    return () => observer.disconnect();
  }, [onContainerWidthChange]);

  function handleBodyScroll(event: UIEvent<HTMLElement>) {
    const viewport = event.currentTarget;
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = viewport.scrollLeft;
    }
    scrollCtx?.notifyScroll(viewport.scrollTop);
  }

  return (
    <div ref={rootRef} className={cn("flex min-h-0 w-full flex-1 flex-col overscroll-none", className)}>
      <div
        ref={headerScrollRef}
        className={cn(
          "shrink-0 overflow-x-auto overflow-y-hidden overscroll-none",
          "[-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden",
        )}
      >
        <Table style={tableStyle} className={tableLayoutClassName}>
          {columnGroup}
          {header}
        </Table>
      </div>
      <ScrollArea
        className="min-h-0 w-full flex-1 overscroll-none"
        viewportClassName="scroll-area-viewport-table"
        onViewportScroll={handleBodyScroll}
      >
        <Table style={tableStyle} className={tableLayoutClassName}>
          {columnGroup}
          {body}
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
