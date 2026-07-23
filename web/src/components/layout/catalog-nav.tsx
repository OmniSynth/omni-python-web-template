import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { collectVisibleNavCatalogs, type VisibleNavCatalog } from "@/lib/nav-menu-data";
import { prefetchPage } from "@/lib/page-registry";
import { cn } from "@/lib/utils";

const navItemClass = cn(
  "rounded-md transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
);

const catalogTriggerClass = (isCatalogActive: boolean, open: boolean) =>
  cn(
    navItemClass,
    "shrink-0 px-2.5 py-1.5 text-sm whitespace-nowrap",
    isCatalogActive
      ? "bg-primary font-medium text-primary-foreground"
      : open
        ? "bg-muted text-sidebar-foreground"
        : "text-sidebar-foreground hover:bg-muted active:bg-muted",
  );

const submenuLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    navItemClass,
    "block px-3 py-2 text-sm",
    isActive
      ? "bg-primary font-medium text-primary-foreground"
      : "text-sidebar-foreground hover:bg-muted active:bg-muted",
  );

function isMenuPathActive(pathname: string, routePath: string): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

type CatalogNavProps = {
  /** 子菜单弹出方向：顶栏向下、底栏向上。 */
  dropdownSide: "top" | "bottom";
  onNavigate?: () => void;
  className?: string;
};

/** 水平目录导航：仅展示目录，悬浮展开下级菜单（Popover 挂载到 body，避免 ScrollArea 裁剪）。 */
export function CatalogNav({ dropdownSide, onNavigate, className }: CatalogNavProps) {
  const { hasPermission, navTree } = useAuth();
  const location = useLocation();
  const catalogs = useMemo(() => collectVisibleNavCatalogs(navTree, hasPermission), [hasPermission, navTree]);
  const isHeader = dropdownSide === "bottom";

  if (catalogs.length === 0) return null;

  return (
    <ScrollArea className={cn(isHeader ? "h-full min-w-0 w-full" : "min-w-0 w-full", className)}>
      <nav
        className={cn("flex w-max min-w-full gap-0.5 px-1", isHeader ? "h-full items-stretch" : "items-center py-1.5")}
      >
        {catalogs.map((catalog) => {
          const isCatalogActive = catalog.menus.some((menu) => isMenuPathActive(location.pathname, menu.routePath));
          return (
            <CatalogNavItem
              key={catalog.code}
              catalog={catalog}
              dropdownSide={dropdownSide}
              isCatalogActive={isCatalogActive}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

type CatalogNavItemProps = {
  catalog: VisibleNavCatalog;
  dropdownSide: "top" | "bottom";
  isCatalogActive: boolean;
  onNavigate?: () => void;
};

function CatalogNavItem({ catalog, dropdownSide, isCatalogActive, onNavigate }: CatalogNavItemProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        className="outline-none focus-visible:outline-none focus-visible:ring-0"
        render={
          <button
            type="button"
            className={catalogTriggerClass(isCatalogActive, open)}
            aria-expanded={open}
            aria-haspopup="menu"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          />
        }
      >
        {catalog.name}
      </PopoverTrigger>
      <PopoverContent
        side={dropdownSide}
        align="start"
        sideOffset={2}
        className="w-auto min-w-40 p-1"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div role="menu">
          {catalog.menus.map((menu) => (
            <NavLink
              key={menu.code}
              to={menu.routePath}
              end={catalog.menus.some((item) => item.routePath.startsWith(`${menu.routePath}/`))}
              role="menuitem"
              className={submenuLinkClass}
              onMouseEnter={() => prefetchPage(menu.componentKey)}
              onFocus={() => prefetchPage(menu.componentKey)}
              onClick={onNavigate}
            >
              {menu.name}
            </NavLink>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
