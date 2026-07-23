import { type RefObject, useCallback, useLayoutEffect, useState } from "react";
import { EXPAND_FAB_SIZE, SIDE_NAV_HOVER_MENU_MAX_HEIGHT } from "@/lib/device-nav-layout";

const VIEWPORT_PADDING = 8;
const FAB_MENU_GAP = 8;
/** 首次定位尚未量到宽度时的估算值（目录 + 菜单双列）。 */
const ESTIMATED_MENU_WIDTH = 352;

export type SideNavHoverMenuPlacement = {
  left: number;
  top: number;
  cascadeSide: "left" | "right";
};

type UseSideNavHoverMenuPlacementOptions = {
  contentRef: RefObject<HTMLElement | null>;
  fabX: number;
  fabY: number;
  side: "left" | "right";
  active: boolean;
  /** 锁定后的目录列高度；未就绪时用面板最大高度估算定位。 */
  panelHeight?: number;
};

/** 根据悬浮球位置与一级目录列尺寸计算 fixed 定位，必要时翻转展开方向。 */
export function computeSideNavHoverMenuPlacement(
  fabX: number,
  fabY: number,
  menuWidth: number,
  menuHeight: number,
  side: "left" | "right",
): SideNavHoverMenuPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cappedMenuHeight = Math.min(menuHeight, SIDE_NAV_HOVER_MENU_MAX_HEIGHT);

  const preferredLeft = side === "left" ? fabX + EXPAND_FAB_SIZE + FAB_MENU_GAP : fabX - FAB_MENU_GAP - menuWidth;
  const alternateLeft = side === "left" ? fabX - FAB_MENU_GAP - menuWidth : fabX + EXPAND_FAB_SIZE + FAB_MENU_GAP;
  const preferredCascade: "left" | "right" = side === "left" ? "right" : "left";
  const alternateCascade: "left" | "right" = side === "left" ? "left" : "right";

  const fitsAt = (left: number) => left >= VIEWPORT_PADDING && left + menuWidth <= vw - VIEWPORT_PADDING;

  let left = preferredLeft;
  let cascadeSide = preferredCascade;

  if (!fitsAt(preferredLeft) && fitsAt(alternateLeft)) {
    left = alternateLeft;
    cascadeSide = alternateCascade;
  }

  left = Math.min(Math.max(left, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, vw - VIEWPORT_PADDING - menuWidth));

  let top = fabY;
  if (top + cappedMenuHeight > vh - VIEWPORT_PADDING) {
    const bottomAlignedTop = fabY + EXPAND_FAB_SIZE - cappedMenuHeight;
    if (bottomAlignedTop >= VIEWPORT_PADDING) {
      top = bottomAlignedTop;
    } else {
      top = VIEWPORT_PADDING;
    }
  }

  const effectiveHeight = Math.min(cappedMenuHeight, vh - top - VIEWPORT_PADDING);
  if (top + effectiveHeight > vh - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, vh - VIEWPORT_PADDING - effectiveHeight);
  }

  return { left, top, cascadeSide };
}

/** 悬浮球旁菜单的初始定位（尚未量宽时使用）。 */
export function defaultSideNavHoverMenuPlacement(
  fabX: number,
  fabY: number,
  side: "left" | "right",
): SideNavHoverMenuPlacement {
  return computeSideNavHoverMenuPlacement(fabX, fabY, ESTIMATED_MENU_WIDTH, SIDE_NAV_HOVER_MENU_MAX_HEIGHT, side);
}

/** 随悬浮球/视口更新定位；首次渲染用估算位置，量宽后精调。 */
export function useSideNavHoverMenuPlacement({
  contentRef,
  fabX,
  fabY,
  side,
  active,
  panelHeight,
}: UseSideNavHoverMenuPlacementOptions): SideNavHoverMenuPlacement {
  const [placement, setPlacement] = useState<SideNavHoverMenuPlacement>(() =>
    defaultSideNavHoverMenuPlacement(fabX, fabY, side),
  );

  const update = useCallback(() => {
    if (!active) return;

    const menuWidth = contentRef.current?.offsetWidth ?? ESTIMATED_MENU_WIDTH;
    const menuHeight = panelHeight ?? contentRef.current?.offsetHeight ?? SIDE_NAV_HOVER_MENU_MAX_HEIGHT;

    setPlacement(computeSideNavHoverMenuPlacement(fabX, fabY, Math.max(menuWidth, 1), Math.max(menuHeight, 1), side));
  }, [active, contentRef, fabX, fabY, panelHeight, side]);

  useLayoutEffect(() => {
    if (!active) return;
    update();
    const id = requestAnimationFrame(update);

    const el = contentRef.current;
    const ro = el ? new ResizeObserver(() => update()) : null;
    if (el && ro) ro.observe(el);

    return () => {
      cancelAnimationFrame(id);
      ro?.disconnect();
    };
  }, [active, contentRef, update]);

  useLayoutEffect(() => {
    if (!active) return;

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active, update]);

  return placement;
}
