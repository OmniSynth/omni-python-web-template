import { SIDE_NAV_HOVER_MENU_MAX_HEIGHT } from "@/lib/device-nav-layout";

/** 悬浮菜单列内细滚动条：窄、低对比，滚动/悬停时略显。 */
export const sideNavHoverMenuScrollBarClass =
  "data-vertical:w-1 data-vertical:border-l-0 p-0 [&_[data-slot=scroll-area-thumb]]:bg-border/25 hover:[&_[data-slot=scroll-area-thumb]]:bg-border/45";

export { SIDE_NAV_HOVER_MENU_MAX_HEIGHT };

/** 菜单项估算行高（与 py-1.5 + text-sm + gap 对齐）。 */
export const SIDE_NAV_HOVER_MENU_ROW_PX = 34;

export const SIDE_NAV_HOVER_MENU_PANEL_PAD_PX = 8;

export function capHoverMenuHeight(naturalPx: number): number {
  return Math.min(Math.max(naturalPx, 0), SIDE_NAV_HOVER_MENU_MAX_HEIGHT);
}
