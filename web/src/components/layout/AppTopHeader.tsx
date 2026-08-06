import { Download, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AppBrand } from "@/components/AppBrand";
import { Can } from "@/components/Can";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { useExportJobBadge } from "@/hooks/use-export-job-badge";
import type { NavMenuPosition } from "@/lib/device-nav-layout";
import { cn } from "@/lib/utils";

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

function DownloadCenterEntry() {
  const { badge, markVisited } = useExportJobBadge(true);
  const { count: badgeCount, tone } = badge;
  const label = badgeCount > 99 ? "99+" : String(badgeCount);
  const toneLabel = tone === "done" ? "可下载" : tone === "active" ? "导出中" : "";

  return (
    <Link
      to="/download-center"
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "h-9 shrink-0 gap-2 px-2.5 text-muted-foreground hover:text-foreground",
      )}
      aria-label={badgeCount > 0 ? `下载中心，${badgeCount} 条${toneLabel}` : "下载中心"}
      title="下载中心"
      onClick={() => void markVisited()}
    >
      <Download className="h-4 w-4 shrink-0" />
      <span className="text-sm text-foreground">下载中心</span>
      {tone !== "none" ? (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs leading-none font-medium tabular-nums text-white",
            tone === "done" ? "bg-emerald-600" : "bg-primary",
          )}
          aria-hidden
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
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

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Can permission="menu.download_center">
          <DownloadCenterEntry />
        </Can>
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
