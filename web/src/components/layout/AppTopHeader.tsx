import { Menu } from "lucide-react";
import type { ReactNode } from "react";
import { AppBrand } from "@/components/AppBrand";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import type { NavMenuPosition } from "@/lib/device-nav-layout";

interface AppTopHeaderProps {
  onOpenNav: () => void;
  onLogout: () => void;
  tenantName?: string | null;
  tenantCode?: string | null;
  sessionRefreshing?: boolean;
  navPosition: NavMenuPosition;
  headerNav?: ReactNode;
  onNavPositionChange: (position: NavMenuPosition) => void;
}

export function AppTopHeader({
  onOpenNav,
  onLogout,
  tenantName,
  tenantCode,
  sessionRefreshing = false,
  navPosition,
  headerNav,
  onNavPositionChange,
}: AppTopHeaderProps) {
  const showTenant = Boolean(tenantName?.trim());

  return (
    <header className="surface-glass relative flex h-16 max-h-16 w-full shrink-0 items-center gap-2 border-b border-border px-3">
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 w-11 shrink-0 p-0 lg:hidden"
          aria-label="打开导航菜单"
          onClick={onOpenNav}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {showTenant ? (
          <div className="flex min-w-0 max-w-[min(40vw,14rem)] items-center gap-2 sm:max-w-xs">
            <AppBrand showName={false} size="md" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs text-muted-foreground">{tenantName}</p>
              {tenantCode ? <p className="truncate text-[11px] text-muted-foreground">{tenantCode}</p> : null}
            </div>
          </div>
        ) : (
          <AppBrand size="md" nameClassName="text-sm" />
        )}
      </div>

      {headerNav ? <div className="hidden min-h-0 min-w-0 flex-1 lg:flex">{headerNav}</div> : null}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <UserMenu onLogout={onLogout} navPosition={navPosition} onNavPositionChange={onNavPositionChange} />
      </div>

      {sessionRefreshing ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-primary/15"
          aria-hidden
        >
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>
      ) : null}
    </header>
  );
}
