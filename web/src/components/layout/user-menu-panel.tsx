import { Link } from "react-router-dom";
import { TimezoneCombobox } from "@/components/form/timezone-combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DateTimeFormatId } from "@/lib/datetime";
import type { NavMenuPosition } from "@/lib/device-nav-layout";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { AuthUser, BoundTenantInfo } from "@/types/auth";

function tenantOptionLabel(tenantName: string, deptName?: string | null): string {
  if (deptName) return `${tenantName}（${deptName}）`;
  return tenantName;
}

interface UserMenuPanelProps {
  user: AuthUser | null;
  name: string;
  boundTenants: BoundTenantInfo[];
  showTenantSwitch: boolean;
  switching: boolean;
  timezone: string;
  timezoneOptions: { value: string; label: string }[];
  dateTimeFormat: DateTimeFormatId;
  dateTimeFormatOptions: { id: DateTimeFormatId; sample: string }[];
  theme: ThemePreference;
  themeOptions: { id: ThemePreference; label: string }[];
  navPosition: NavMenuPosition;
  navPositionOptions: Array<{ id: NavMenuPosition; label: string }>;
  hasProfilePermission: boolean;
  onSwitchTenant: (tenantId: number) => void;
  onTimezoneChange: (timezone: string) => void;
  onDateTimeFormatChange: (format: DateTimeFormatId) => void;
  onThemeChange: (theme: ThemePreference) => void;
  onNavPositionChange: (position: NavMenuPosition) => void;
  onClose: () => void;
  onLogout: () => void;
}

export function UserMenuPanel({
  user,
  name,
  boundTenants,
  showTenantSwitch,
  switching,
  timezone,
  timezoneOptions,
  dateTimeFormat,
  dateTimeFormatOptions,
  theme,
  themeOptions,
  navPosition,
  navPositionOptions,
  hasProfilePermission,
  onSwitchTenant,
  onTimezoneChange,
  onDateTimeFormatChange,
  onThemeChange,
  onNavPositionChange,
  onClose,
  onLogout,
}: UserMenuPanelProps) {
  return (
    <div
      role="menu"
      className="surface-glass-strong absolute right-0 top-[calc(100%+0.375rem)] z-50 w-72 rounded-lg border border-border py-3"
    >
      <div className="border-b border-border px-4 pb-3">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {user?.username && user.username !== name ? (
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        ) : null}
      </div>

      <div className="grid gap-3 px-4 py-3">
        {showTenantSwitch ? (
          <div className="grid gap-1.5">
            <Label htmlFor="user-menu-tenant">切换租户</Label>
            <Select
              value={user?.tenant_id != null ? String(user.tenant_id) : undefined}
              disabled={switching}
              options={boundTenants.map((t) => ({
                value: String(t.id),
                label: tenantOptionLabel(t.name, t.dept_name),
              }))}
              onValueChange={(value) => {
                void onSwitchTenant(Number(value));
              }}
            >
              <SelectTrigger id="user-menu-tenant" className="w-full">
                <SelectValue placeholder="选择租户" />
              </SelectTrigger>
              <SelectContent>
                {boundTenants.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {tenantOptionLabel(t.name, t.dept_name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor="user-menu-timezone">时区</Label>
          <TimezoneCombobox
            id="user-menu-timezone"
            value={timezone}
            options={timezoneOptions}
            onChange={onTimezoneChange}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="user-menu-datetime-format">时间格式</Label>
          <Select
            value={dateTimeFormat}
            options={dateTimeFormatOptions.map((opt) => ({
              value: opt.id,
              label: opt.sample,
            }))}
            onValueChange={(value) => onDateTimeFormatChange(value as DateTimeFormatId)}
          >
            <SelectTrigger id="user-menu-datetime-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateTimeFormatOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.sample}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* 手机端侧栏固定左侧 Sheet，菜单位置仅桌面 lg+ 可配 */}
        <div className="hidden gap-1.5 lg:grid">
          <Label htmlFor="user-menu-nav-position">菜单位置</Label>
          <Select
            value={navPosition}
            options={navPositionOptions.map((opt) => ({
              value: opt.id,
              label: opt.label,
            }))}
            onValueChange={(value) => onNavPositionChange(value as NavMenuPosition)}
          >
            <SelectTrigger id="user-menu-nav-position" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {navPositionOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="user-menu-theme">主题</Label>
          <Select
            value={theme}
            options={themeOptions.map((opt) => ({
              value: opt.id,
              label: opt.label,
            }))}
            onValueChange={(value) => onThemeChange(value as ThemePreference)}
          >
            <SelectTrigger id="user-menu-theme" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-border px-4 pt-3 grid gap-2">
        {hasProfilePermission ? (
          <Link
            to="/profile"
            className={cn(
              "inline-flex h-9 w-full items-center justify-center rounded-md border border-input",
              "bg-secondary px-4 text-sm font-medium text-secondary-foreground shadow-xs hover:bg-secondary/80",
            )}
            onClick={onClose}
          >
            个人中心
          </Link>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className={cn("w-full")}
          onClick={() => {
            onClose();
            onLogout();
          }}
        >
          退出登录
        </Button>
      </div>
    </div>
  );
}
