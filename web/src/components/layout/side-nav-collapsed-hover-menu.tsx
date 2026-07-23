import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { NavMenuLink } from "@/components/layout/nav-menu-link";
import {
  capHoverMenuHeight,
  SIDE_NAV_HOVER_MENU_PANEL_PAD_PX,
  SIDE_NAV_HOVER_MENU_ROW_PX,
  sideNavHoverMenuScrollBarClass,
} from "@/components/layout/side-nav-hover-menu-layout";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useHoverDelayOpen } from "@/hooks/use-hover-delay-open";
import { useLockedHoverMenuHeights } from "@/hooks/use-locked-hover-menu-heights";
import { collectVisibleNavCatalogs, type VisibleNavCatalog } from "@/lib/nav-menu-data";
import { prefetchPage } from "@/lib/page-registry";
import { cn } from "@/lib/utils";

type SideNavCollapsedHoverMenuProps = {
  /** 一级面板相对悬浮球的弹出方向；二级菜单列在同一容器内向同侧排列。 */
  cascadeSide: "left" | "right";
  onNavigate?: () => void;
  /** 目录/菜单列高度锁定后回调，供外层定位使用。 */
  onHeightsLocked?: (heights: { catalog: number; submenu: number }) => void;
  className?: string;
};

const panelShellClass =
  "surface-glass-strong flex min-h-0 w-max max-w-[min(32rem,calc(100vw-1rem))] overflow-hidden rounded-md border border-border text-popover-foreground";

const columnShellClass = "min-h-0 w-max max-w-[min(16rem,calc(50vw-0.5rem))] shrink-0";

const catalogItemClass = (active: boolean, highlighted: boolean) =>
  cn(
    "flex w-full items-center gap-1 rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap transition-colors",
    active
      ? "bg-primary font-medium text-primary-foreground"
      : highlighted
        ? "bg-muted text-sidebar-foreground"
        : "text-sidebar-foreground hover:bg-muted active:bg-muted",
  );

const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "block rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
    isActive
      ? "bg-primary font-medium text-primary-foreground"
      : "text-sidebar-foreground hover:bg-muted active:bg-muted",
  );

function isMenuPathActive(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

function HoverMenuScrollColumn({
  height,
  children,
  className,
}: {
  height: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ScrollArea
      className={cn(columnShellClass, className)}
      style={{ height }}
      viewportClassName="h-full max-h-full w-max"
      viewportStyle={{ height: `${height}px`, maxHeight: `${height}px` }}
    >
      {children}
      <ScrollBar className={sideNavHoverMenuScrollBarClass} />
    </ScrollArea>
  );
}

type CatalogRowProps = {
  catalog: VisibleNavCatalog;
  pathname: string;
  isHighlighted: boolean;
  Chevron: typeof ChevronRight;
  onHover: () => void;
};

function CatalogRow({ catalog, pathname, isHighlighted, Chevron, onHover }: CatalogRowProps) {
  const isRouteActive = catalog.menus.some((menu) => isMenuPathActive(pathname, menu.routePath));

  return (
    <div className="relative" onMouseEnter={onHover}>
      <button
        type="button"
        className={catalogItemClass(isRouteActive && !isHighlighted, isHighlighted)}
        aria-expanded={isHighlighted}
      >
        <span className="min-w-0 flex-1 truncate">{catalog.name}</span>
        <Chevron className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
    </div>
  );
}

/** 侧栏折叠时悬浮球旁：目录与二级菜单同容器双列，列内独立细滚动条。 */
export function SideNavCollapsedHoverMenu({
  cascadeSide,
  onNavigate,
  onHeightsLocked,
  className,
}: SideNavCollapsedHoverMenuProps) {
  const { hasPermission, navTree } = useAuth();
  const location = useLocation();
  const catalogs = useMemo(() => collectVisibleNavCatalogs(navTree, hasPermission), [hasPermission, navTree]);
  const activeCatalogCode = useMemo(() => {
    for (const catalog of catalogs) {
      if (catalog.menus.some((menu) => isMenuPathActive(location.pathname, menu.routePath))) {
        return catalog.code;
      }
    }
    return catalogs[0]?.code ?? null;
  }, [catalogs, location.pathname]);

  const [hoveredCode, setHoveredCode] = useState<string | null>(activeCatalogCode);
  const { open: submenuOpen, openNow: openSubmenu } = useHoverDelayOpen();
  const { locked, navRef } = useLockedHoverMenuHeights(catalogs);
  const estimatedSubmenuHeight = useMemo(() => {
    const maxMenus = Math.max(...catalogs.map((c) => c.menus.length), 0);
    return capHoverMenuHeight(maxMenus * SIDE_NAV_HOVER_MENU_ROW_PX + SIDE_NAV_HOVER_MENU_PANEL_PAD_PX);
  }, [catalogs]);
  const estimatedCatalogHeight = useMemo(() => {
    return capHoverMenuHeight(catalogs.length * SIDE_NAV_HOVER_MENU_ROW_PX + SIDE_NAV_HOVER_MENU_PANEL_PAD_PX);
  }, [catalogs.length]);
  const panelColumnHeight = locked
    ? Math.max(locked.catalog, locked.submenu)
    : Math.max(estimatedCatalogHeight, estimatedSubmenuHeight);

  useEffect(() => {
    setHoveredCode(activeCatalogCode);
  }, [activeCatalogCode]);

  useEffect(() => {
    openSubmenu();
  }, [openSubmenu]);

  useLayoutEffect(() => {
    if (locked) onHeightsLocked?.(locked);
  }, [locked, onHeightsLocked]);

  const hoveredCatalog = catalogs.find((c) => c.code === hoveredCode) ?? null;
  const showSubmenu = submenuOpen && hoveredCatalog != null;
  const expandRight = cascadeSide === "right";
  const Chevron = expandRight ? ChevronRight : ChevronLeft;

  if (catalogs.length === 0) return null;

  const catalogNav = (
    <nav ref={navRef} className="flex w-max flex-col gap-0.5">
      {catalogs.map((catalog) => (
        <CatalogRow
          key={catalog.code}
          catalog={catalog}
          pathname={location.pathname}
          isHighlighted={Boolean(showSubmenu && catalog.code === hoveredCatalog?.code)}
          Chevron={Chevron}
          onHover={() => {
            setHoveredCode(catalog.code);
            openSubmenu();
          }}
        />
      ))}
    </nav>
  );

  const catalogColumn = locked ? (
    <HoverMenuScrollColumn height={panelColumnHeight} className="p-1">
      {catalogNav}
    </HoverMenuScrollColumn>
  ) : (
    <div className={cn(columnShellClass, "p-1")}>{catalogNav}</div>
  );

  const menuColumn =
    showSubmenu && hoveredCatalog ? (
      <HoverMenuScrollColumn height={panelColumnHeight} className="p-1">
        <MenuColumn catalog={hoveredCatalog} onNavigate={onNavigate} />
      </HoverMenuScrollColumn>
    ) : null;

  return (
    <div className={cn(panelShellClass, className)}>
      {expandRight ? (
        <>
          {catalogColumn}
          {menuColumn}
        </>
      ) : (
        <>
          {menuColumn}
          {catalogColumn}
        </>
      )}
    </div>
  );
}

function MenuColumn({ catalog, onNavigate }: { catalog: VisibleNavCatalog; onNavigate?: () => void }) {
  return (
    <div role="menu" className="flex w-max flex-col gap-0.5">
      {catalog.menus.map((menu) => (
        <NavMenuLink
          key={menu.code}
          to={menu.routePath}
          end={catalog.menus.some((item) => item.routePath.startsWith(`${menu.routePath}/`))}
          role="menuitem"
          className={menuLinkClass}
          onMouseEnter={() => prefetchPage(menu.componentKey)}
          onFocus={() => prefetchPage(menu.componentKey)}
          onAfterNavigate={onNavigate}
        >
          {menu.name}
        </NavMenuLink>
      ))}
    </div>
  );
}
