import { useEffect, useRef, useState } from "react";
import { UserMenuPanel } from "@/components/layout/user-menu-panel";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { avatarHue, avatarLabel } from "@/lib/avatar";
import { NAV_MENU_POSITION_OPTIONS, type NavMenuPosition } from "@/lib/device-nav-layout";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import { isPortaledOverlayTarget } from "@/lib/portaled-overlay";

interface UserMenuProps {
  onLogout: () => void;
  navPosition: NavMenuPosition;
  onNavPositionChange: (position: NavMenuPosition) => void;
}

export function UserMenu({ onLogout, navPosition, onNavPositionChange }: UserMenuProps) {
  const { user, boundTenants, switchTenant, hasPermission } = useAuth();
  const { timezone, timezoneOptions, setTimezone, dateTimeFormat, dateTimeFormatOptions, setDateTimeFormat } =
    useTimezone();
  const { theme, themeOptions, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const name = user?.display_name || user?.username || "";
  const label = avatarLabel(user?.display_name, user?.username);
  const hue = avatarHue(name || "user");
  const avatarUrl = user?.avatar_url?.trim() || "";
  const showTenantSwitch = boundTenants.length > 1;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (isPortaledOverlayTarget(e.target)) return;
      if (document.querySelector('[data-slot="select-content"][data-open]')) return;
      if (document.querySelector('[data-slot="popover-content"][data-open]')) return;
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSwitchTenant(tenantId: number) {
    if (tenantId === user?.tenant_id) return;
    setSwitching(true);
    try {
      await switchTenant(tenantId);
      setOpen(false);
    } catch (err) {
      showToastError(errorMessage(err, "切换租户失败"));
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-xs font-medium text-white ring-2 ring-transparent transition hover:ring-primary/40 focus:outline-none focus:ring-primary"
        style={avatarUrl ? undefined : { backgroundColor: `hsl(${hue} 45% 42%)` }}
        aria-label="用户菜单"
        aria-expanded={open}
        aria-haspopup="menu"
        title={name}
        onClick={() => setOpen((v) => !v)}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : label}
      </button>

      {open ? (
        <UserMenuPanel
          user={user}
          name={name}
          boundTenants={boundTenants}
          showTenantSwitch={showTenantSwitch}
          switching={switching}
          timezone={timezone}
          timezoneOptions={timezoneOptions}
          dateTimeFormat={dateTimeFormat}
          dateTimeFormatOptions={dateTimeFormatOptions}
          theme={theme}
          themeOptions={themeOptions}
          navPosition={navPosition}
          navPositionOptions={NAV_MENU_POSITION_OPTIONS}
          hasProfilePermission={hasPermission("menu.profile")}
          onSwitchTenant={handleSwitchTenant}
          onTimezoneChange={setTimezone}
          onDateTimeFormatChange={setDateTimeFormat}
          onThemeChange={setTheme}
          onNavPositionChange={onNavPositionChange}
          onClose={() => setOpen(false)}
          onLogout={onLogout}
        />
      ) : null}
    </div>
  );
}
