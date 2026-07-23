import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppTopHeader } from "@/components/layout/AppTopHeader";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { HorizontalNav } from "@/components/layout/horizontal-nav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SideNavExpandFab } from "@/components/layout/side-nav-expand-fab";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceNavLayout } from "@/hooks/use-device-nav-layout";
import { useNavCatalogExpanded } from "@/hooks/use-nav-catalog-expanded";
import { isSideNavPosition } from "@/lib/device-nav-layout";
import { dismissOpenPortaledOverlays } from "@/lib/portaled-overlay";

export { PageFilterToolbar } from "@/components/layout/PageFilterToolbar";
export {
  Page,
  PageBody,
  PageFooter,
  PageHeader,
  PageMessage,
  PageSection,
  PageToolbar,
} from "@/components/layout/PageLayout";
export { PageTabBar } from "@/components/layout/PageTabBar";
export {
  PageFilterToolbarHeaderActions,
  PageFilterToolbarProvider,
} from "@/components/layout/page-filter-toolbar-context";
export { TablePagination } from "@/components/layout/TablePagination";

export function AppShell() {
  const { logout, navTree, currentTenant, refreshing, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { layout, setWidth, setPosition, toggleCollapsed, setExpandFabPosition } = useDeviceNavLayout();
  const { expanded, activeCatalog, toggleCatalog } = useNavCatalogExpanded(user, navTree);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = location.pathname;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 路由切换时关闭移动端导航抽屉
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  function handleLogout() {
    void logout().then(() => navigate("/login", { replace: true }));
  }

  const sidebarProps = {
    expanded,
    activeCatalogCode: activeCatalog,
    onToggleCatalog: toggleCatalog,
  };

  const showSidePanel = isSideNavPosition(layout.position) && !layout.collapsed;
  const sidePanel = showSidePanel ? (
    <DesktopSidebar
      side={layout.position === "right" ? "right" : "left"}
      width={layout.width}
      onWidthChange={setWidth}
      onCollapse={toggleCollapsed}
    >
      <SidebarNav {...sidebarProps} />
    </DesktopSidebar>
  ) : null;

  return (
    <div className="app-shell flex h-dvh w-full flex-col overflow-hidden overscroll-none">
      <div className="app-shell__ambient" aria-hidden />
      <div className="app-shell__header shrink-0">
        <AppTopHeader
          onOpenNav={() => {
            dismissOpenPortaledOverlays();
            setNavOpen(true);
          }}
          onLogout={handleLogout}
          tenantName={currentTenant?.name}
          tenantCode={currentTenant?.code}
          sessionRefreshing={refreshing}
          navPosition={layout.position}
          headerNav={layout.position === "top" ? <HorizontalNav variant="header" /> : null}
          onNavPositionChange={setPosition}
        />
      </div>

      {isSideNavPosition(layout.position) && layout.collapsed ? (
        <SideNavExpandFab
          side={layout.position}
          position={layout.expandFab}
          onPositionChange={setExpandFabPosition}
          onExpand={toggleCollapsed}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 min-w-0 flex-1">
          {layout.position === "left" ? sidePanel : null}

          <div className="surface-glass-pane flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </div>

          {layout.position === "right" ? sidePanel : null}
        </div>

        {layout.position === "bottom" ? (
          <footer className="surface-glass hidden shrink-0 border-t border-border lg:block">
            <HorizontalNav variant="footer" />
          </footer>
        ) : null}
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" layer="nav" className="flex w-[min(100vw,17.5rem)] flex-col gap-0 p-0 sm:max-w-xs">
          <SheetHeader className="shrink-0">
            <SheetTitle>导航</SheetTitle>
            {currentTenant ? (
              <div className="leading-tight">
                <p className="text-sm text-muted-foreground">{currentTenant.name}</p>
                {currentTenant.code ? <p className="text-xs text-muted-foreground">{currentTenant.code}</p> : null}
              </div>
            ) : null}
          </SheetHeader>
          <SidebarNav {...sidebarProps} variant="drawer" onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
