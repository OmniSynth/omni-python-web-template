import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { SideNavCollapsedHoverMenu } from "@/components/layout/side-nav-collapsed-hover-menu";
import { Button } from "@/components/ui/button";
import { useHoverDelayOpen } from "@/hooks/use-hover-delay-open";
import { useSideNavExpandFab } from "@/hooks/use-side-nav-expand-fab";
import { useSideNavHoverMenuPlacement } from "@/hooks/use-side-nav-hover-menu-placement";
import { EXPAND_FAB_SIZE, type ExpandFabPosition, type NavMenuPosition } from "@/lib/device-nav-layout";
import { cn } from "@/lib/utils";

type SideNavExpandFabProps = {
  side: Extract<NavMenuPosition, "left" | "right">;
  position?: ExpandFabPosition;
  onPositionChange: (position: ExpandFabPosition) => void;
  onExpand: () => void;
};

/** 侧栏折叠后悬浮展开按钮：可拖动、悬浮展示目录菜单、Portal 挂载、始终置顶。 */
export function SideNavExpandFab({ side, position, onPositionChange, onExpand }: SideNavExpandFabProps) {
  const isLeft = side === "left";
  const Icon = isLeft ? PanelLeftOpen : PanelRightOpen;
  const { open: hoverOpen, openNow, scheduleClose } = useHoverDelayOpen();
  const { coords, dragging, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    useSideNavExpandFab({ side, position, onPositionChange, onExpand });
  const menuRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | undefined>();
  const showHoverMenu = hoverOpen && !dragging;
  const pathname = useLocation().pathname;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 路由切换时关闭悬浮菜单
  useEffect(() => {
    setPanelHeight(undefined);
    scheduleClose();
  }, [pathname, scheduleClose]);

  const handleHeightsLocked = useCallback((heights: { catalog: number; submenu: number }) => {
    setPanelHeight(Math.max(heights.catalog, heights.submenu));
  }, []);

  const handleScheduleClose = useCallback(() => {
    setPanelHeight(undefined);
    scheduleClose();
  }, [scheduleClose]);

  const menuPlacement = useSideNavHoverMenuPlacement({
    contentRef: menuRef,
    fabX: coords.x,
    fabY: coords.y,
    side,
    active: showHoverMenu,
    panelHeight,
  });

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className="fixed z-9999 hidden lg:block"
        style={{ left: coords.x, top: coords.y, width: EXPAND_FAB_SIZE, height: EXPAND_FAB_SIZE }}
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
      >
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn("h-9 w-9 touch-none shadow-lg select-none", dragging ? "cursor-grabbing" : "cursor-grab")}
          style={{ width: EXPAND_FAB_SIZE, height: EXPAND_FAB_SIZE }}
          aria-label="展开菜单（可拖动，悬浮查看目录）"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <Icon className="pointer-events-none h-4 w-4" />
        </Button>
      </div>
      {showHoverMenu ? (
        <div
          ref={menuRef}
          className="fixed z-9999 hidden lg:block"
          style={{
            left: menuPlacement.left,
            top: menuPlacement.top,
          }}
          onMouseEnter={openNow}
          onMouseLeave={handleScheduleClose}
        >
          <SideNavCollapsedHoverMenu cascadeSide={menuPlacement.cascadeSide} onHeightsLocked={handleHeightsLocked} />
        </div>
      ) : null}
    </>,
    document.body,
  );
}
