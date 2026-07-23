import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { NavMenuLink } from "@/components/layout/nav-menu-link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { prefetchPage } from "@/lib/page-registry";
import { cn } from "@/lib/utils";
import type { PermissionInfo } from "@/types/auth";

interface SidebarNavProps {
  expanded: Set<string>;
  /** 当前路由所属目录，首帧同步展开，避免 refresh 后折叠再弹开。 */
  activeCatalogCode?: string | null;
  onToggleCatalog: (code: string) => void;
  onNavigate?: () => void;
  /** 桌面侧栏折叠目录；抽屉模式平铺菜单、加大触控区。 */
  variant?: "sidebar" | "drawer";
  className?: string;
}

function catalogForPath(tree: PermissionInfo[], pathname: string): string | null {
  for (const catalog of tree) {
    for (const menu of catalog.children) {
      const route = menu.route_path;
      if (route && (pathname === route || pathname.startsWith(`${route}/`))) {
        return catalog.code;
      }
    }
  }
  return null;
}

export { catalogForPath };

export function SidebarNav({
  expanded,
  activeCatalogCode,
  onToggleCatalog,
  onNavigate,
  variant = "sidebar",
  className,
}: SidebarNavProps) {
  const { hasPermission, navTree } = useAuth();
  const isDrawer = variant === "drawer";

  const visibleCatalogCount = useMemo(
    () =>
      navTree.filter((catalog) =>
        catalog.children.some((item) => item.kind === "menu" && item.route_path != null && hasPermission(item.code)),
      ).length,
    [hasPermission, navTree],
  );
  const showCatalogLabel = visibleCatalogCount > 1;

  const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "block shrink-0 rounded-md transition-colors",
      isDrawer ? "min-h-11 px-4 py-2.5 text-base" : "px-2 py-1.5 text-sm",
      isActive
        ? "bg-primary font-medium text-primary-foreground"
        : "text-sidebar-foreground hover:bg-muted active:bg-muted",
    );

  return (
    <ScrollArea className={cn("min-h-0 text-sidebar-foreground", isDrawer ? "flex-1" : "h-full", className)}>
      <nav className={cn("flex flex-col gap-1 pr-2", isDrawer ? "gap-0 px-2 py-3" : "px-1 py-2")}>
        {navTree.map((catalog) => {
          const menus = catalog.children.filter((item) => {
            if (item.kind !== "menu") return false;
            const route = item.route_path;
            return route !== undefined && route !== null && hasPermission(item.code);
          });
          if (menus.length === 0) return null;

          const isOpen = isDrawer || expanded.has(catalog.code) || catalog.code === activeCatalogCode;

          return (
            <div key={catalog.code} className={cn(isDrawer && "pb-1")}>
              {showCatalogLabel ? (
                isDrawer ? (
                  <p className="px-4 pb-1 pt-3 text-xs font-semibold tracking-wide text-muted-foreground">
                    {catalog.name}
                  </p>
                ) : (
                  <button
                    type="button"
                    className="flex w-full min-h-9 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                    aria-expanded={isOpen}
                    onClick={() => onToggleCatalog(catalog.code)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{catalog.name}</span>
                  </button>
                )
              ) : null}
              {isOpen ? (
                <div className={cn("flex flex-col", isDrawer ? "gap-0.5" : "mt-0.5 gap-0.5 pl-2")}>
                  {menus.map((menu) => {
                    const to = menu.route_path;
                    if (!to) return null;
                    const hasChildMenu = menus.some((item) => item.route_path?.startsWith(`${to}/`));
                    return (
                      <NavMenuLink
                        key={menu.code}
                        to={to}
                        end={hasChildMenu}
                        className={menuLinkClass}
                        onMouseEnter={() => prefetchPage(menu.component_key)}
                        onFocus={() => prefetchPage(menu.component_key)}
                        onAfterNavigate={onNavigate}
                      >
                        {menu.name}
                      </NavMenuLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <ScrollBar />
    </ScrollArea>
  );
}
