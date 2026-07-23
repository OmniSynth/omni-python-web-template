import { useLayoutEffect, useRef, useState } from "react";
import {
  capHoverMenuHeight,
  SIDE_NAV_HOVER_MENU_PANEL_PAD_PX,
  SIDE_NAV_HOVER_MENU_ROW_PX,
} from "@/components/layout/side-nav-hover-menu-layout";
import type { VisibleNavCatalog } from "@/lib/nav-menu-data";

export type LockedHoverMenuHeights = {
  catalog: number;
  submenu: number;
};

/** 菜单打开后一次性测量并锁定目录/二级列高度，悬浮切换目录不再改变面板高度。 */
export function useLockedHoverMenuHeights(catalogs: VisibleNavCatalog[]) {
  const navRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState<LockedHoverMenuHeights | null>(null);

  useLayoutEffect(() => {
    if (locked || catalogs.length === 0) return;

    let cancelled = false;
    let attempts = 0;

    const measure = () => {
      if (cancelled || locked) return;
      const nav = navRef.current;
      if (!nav) return;

      if (nav.scrollHeight === 0 && attempts < 4) {
        attempts += 1;
        requestAnimationFrame(measure);
        return;
      }

      const catalog = capHoverMenuHeight(Math.max(nav.scrollHeight, nav.getBoundingClientRect().height));
      const maxMenus = Math.max(...catalogs.map((c) => c.menus.length), 0);
      const submenuNatural = maxMenus * SIDE_NAV_HOVER_MENU_ROW_PX + SIDE_NAV_HOVER_MENU_PANEL_PAD_PX;
      const submenu = capHoverMenuHeight(submenuNatural);

      setLocked({ catalog: Math.max(catalog, 1), submenu });
    };

    measure();
    return () => {
      cancelled = true;
    };
  }, [catalogs, locked]);

  return { locked, navRef };
}
