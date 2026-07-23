/** 设备级导航布局（位置、侧栏宽度、折叠）；登出保留，与租户展示同级。 */

export const DEVICE_NAV_LAYOUT_KEY = "omni-sidebar-layout";

export const SIDEBAR_DEFAULT_WIDTH = 180;
export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 360;

export const EXPAND_FAB_SIZE = 36;
/** 侧栏折叠悬浮球菜单面板最大高度（px）。 */
export const SIDE_NAV_HOVER_MENU_MAX_HEIGHT = 480;
const HEADER_HEIGHT = 64;

export type ExpandFabPosition = {
  x: number;
  y: number;
};

export type NavMenuPosition = "left" | "right" | "top" | "bottom";

export const NAV_MENU_POSITION_OPTIONS: Array<{ id: NavMenuPosition; label: string }> = [
  { id: "left", label: "左侧菜单" },
  { id: "right", label: "右侧菜单" },
  { id: "top", label: "顶部菜单（与顶栏合并）" },
  { id: "bottom", label: "底部菜单" },
];

export interface DeviceNavLayout {
  position: NavMenuPosition;
  width: number;
  collapsed: boolean;
  expandFab?: ExpandFabPosition;
}

const DEFAULT_LAYOUT: DeviceNavLayout = {
  position: "left",
  width: SIDEBAR_DEFAULT_WIDTH,
  collapsed: false,
};

function clampWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

function isNavMenuPosition(value: unknown): value is NavMenuPosition {
  return value === "left" || value === "right" || value === "top" || value === "bottom";
}

function isValidExpandFab(value: unknown): value is ExpandFabPosition {
  if (!value || typeof value !== "object") return false;
  const row = value as ExpandFabPosition;
  return typeof row.x === "number" && typeof row.y === "number";
}

function isValidLayout(value: unknown): value is DeviceNavLayout {
  if (!value || typeof value !== "object") return false;
  const row = value as DeviceNavLayout;
  return (
    isNavMenuPosition(row.position) &&
    typeof row.width === "number" &&
    typeof row.collapsed === "boolean" &&
    (row.expandFab == null || isValidExpandFab(row.expandFab))
  );
}

export function clampExpandFabPosition(x: number, y: number, size = EXPAND_FAB_SIZE): ExpandFabPosition {
  if (typeof window === "undefined") {
    return { x: Math.round(x), y: Math.round(y) };
  }
  const maxX = Math.max(0, window.innerWidth - size);
  const maxY = Math.max(0, window.innerHeight - size);
  return {
    x: Math.min(maxX, Math.max(0, Math.round(x))),
    y: Math.min(maxY, Math.max(0, Math.round(y))),
  };
}

/** 侧栏展开按钮默认位置：顶栏左/右下角半露出。 */
export function defaultExpandFabPosition(side: Extract<NavMenuPosition, "left" | "right">): ExpandFabPosition {
  const inset = 12;
  const y = HEADER_HEIGHT - EXPAND_FAB_SIZE / 2;
  const x =
    side === "left"
      ? inset
      : Math.max(inset, (typeof window !== "undefined" ? window.innerWidth : 1280) - inset - EXPAND_FAB_SIZE);
  return clampExpandFabPosition(x, y);
}

export function normalizeNavLayout(raw: Partial<DeviceNavLayout>): DeviceNavLayout {
  const position = isNavMenuPosition(raw.position) ? raw.position : "left";
  const expandFab = isValidExpandFab(raw.expandFab)
    ? clampExpandFabPosition(raw.expandFab.x, raw.expandFab.y)
    : undefined;
  return {
    position,
    width: clampWidth(raw.width ?? SIDEBAR_DEFAULT_WIDTH),
    collapsed: raw.collapsed ?? false,
    ...(expandFab ? { expandFab } : {}),
  };
}

/** 同步读取设备级导航布局。 */
export function readDeviceNavLayout(): DeviceNavLayout {
  try {
    const stored = localStorage.getItem(DEVICE_NAV_LAYOUT_KEY);
    if (!stored) return DEFAULT_LAYOUT;
    const parsed: unknown = JSON.parse(stored);
    if (isValidLayout(parsed)) return normalizeNavLayout(parsed);
    return DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function writeDeviceNavLayout(layout: DeviceNavLayout): void {
  try {
    localStorage.setItem(DEVICE_NAV_LAYOUT_KEY, JSON.stringify(normalizeNavLayout(layout)));
  } catch {
    /* 忽略 */
  }
}

export function isSideNavPosition(position: NavMenuPosition): position is Extract<NavMenuPosition, "left" | "right"> {
  return position === "left" || position === "right";
}
