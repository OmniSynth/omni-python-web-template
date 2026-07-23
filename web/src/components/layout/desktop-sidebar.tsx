import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { type NavMenuPosition, normalizeNavLayout, SIDEBAR_MIN_WIDTH } from "@/lib/device-nav-layout";
import { cn } from "@/lib/utils";

type DesktopSidebarProps = {
  side: Extract<NavMenuPosition, "left" | "right">;
  width: number;
  onWidthChange: (width: number) => void;
  onCollapse: () => void;
  children: ReactNode;
};

export function DesktopSidebar({ side, width, onWidthChange, onCollapse, children }: DesktopSidebarProps) {
  const dragRef = useRef({ active: false, startX: 0, startWidth: width });
  const isLeft = side === "left";

  const stopDrag = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      if (!dragRef.current.active) return;
      const delta = isLeft ? event.clientX - dragRef.current.startX : dragRef.current.startX - event.clientX;
      const next = normalizeNavLayout({ width: dragRef.current.startWidth + delta, collapsed: false });
      onWidthChange(next.width);
    }
    function onMouseUp() {
      stopDrag();
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      stopDrag();
    };
  }, [isLeft, onWidthChange, stopDrag]);

  function startResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    dragRef.current = { active: true, startX: event.clientX, startWidth: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const CollapseIcon = isLeft ? PanelLeftClose : PanelRightClose;

  return (
    <aside
      className={cn(
        "surface-glass relative hidden h-full shrink-0 flex-col text-sidebar-foreground lg:flex",
        isLeft ? "border-r border-sidebar-border" : "border-l border-sidebar-border",
      )}
      style={{ width, minWidth: SIDEBAR_MIN_WIDTH, maxWidth: width }}
    >
      <div className="min-h-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center border-t border-border px-2 py-2 lg:py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start gap-2 px-2 text-xs text-muted-foreground"
          aria-label="折叠侧栏"
          onClick={onCollapse}
        >
          <CollapseIcon className="h-4 w-4 shrink-0" />
          折叠菜单
        </Button>
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整菜单宽度"
        className={cn(
          "absolute inset-y-0 z-10 w-1.5 cursor-col-resize touch-none",
          isLeft
            ? "right-0 hover:bg-primary/20 active:bg-primary/30"
            : "left-0 hover:bg-primary/20 active:bg-primary/30",
        )}
        onMouseDown={startResize}
      />
    </aside>
  );
}
