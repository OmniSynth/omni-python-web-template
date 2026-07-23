import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import * as React from "react";

import { cn } from "@/lib/utils";

/** 停止滚动后延迟隐藏滚动条（毫秒）。 */
const SCROLLBAR_IDLE_MS = 800;

const scrollBarClassName = cn(
  "flex touch-none p-px select-none transition-opacity duration-300",
  "pointer-events-none opacity-0",
  "group-data-scrolling/scroll-area:pointer-events-auto group-data-scrolling/scroll-area:opacity-100",
  "data-hovering:pointer-events-auto data-hovering:opacity-100",
  "data-scrolling:pointer-events-auto data-scrolling:opacity-100",
  "data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent",
  "data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
);

/** 项目定制：细滚动条 + 预留 gutter；滚动时显示，停止后淡出。 */
function ScrollArea({
  className,
  children,
  onViewportScroll,
  viewportClassName,
  viewportStyle,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  onViewportScroll?: (event: React.UIEvent<HTMLElement>) => void;
  viewportClassName?: string;
  viewportStyle?: React.CSSProperties;
}) {
  const [scrolling, setScrolling] = React.useState(false);
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const markScrolling = React.useCallback(() => {
    setScrolling(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setScrolling(false);
      idleTimerRef.current = null;
    }, SCROLLBAR_IDLE_MS);
  }, []);

  const handleViewportScroll = React.useCallback(
    (event: React.UIEvent<HTMLElement>) => {
      markScrolling();
      onViewportScroll?.(event);
    },
    [markScrolling, onViewportScroll],
  );

  React.useEffect(
    () => () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    },
    [],
  );

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      data-scrolling={scrolling ? "" : undefined}
      className={cn("group/scroll-area relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        style={viewportStyle}
        className={cn(
          "scroll-area-viewport size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
          "overscroll-none scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          viewportClassName,
        )}
        onScroll={handleViewportScroll}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({ className, orientation = "vertical", ...props }: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(scrollBarClassName, className)}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
