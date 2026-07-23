import { useCallback, useState } from "react";
import {
  type DeviceNavLayout,
  type NavMenuPosition,
  normalizeNavLayout,
  readDeviceNavLayout,
  writeDeviceNavLayout,
} from "@/lib/device-nav-layout";

export function useDeviceNavLayout() {
  const [layout, setLayoutState] = useState<DeviceNavLayout>(() => readDeviceNavLayout());

  const applyLayout = useCallback((patch: Partial<DeviceNavLayout>) => {
    setLayoutState((prev) => {
      const next = normalizeNavLayout({ ...prev, ...patch });
      writeDeviceNavLayout(next);
      return next;
    });
  }, []);

  const setWidth = useCallback((width: number) => applyLayout({ width }), [applyLayout]);

  const setPosition = useCallback((position: NavMenuPosition) => applyLayout({ position }), [applyLayout]);

  const toggleCollapsed = useCallback(() => {
    setLayoutState((prev) => {
      const next = normalizeNavLayout({ ...prev, collapsed: !prev.collapsed });
      writeDeviceNavLayout(next);
      return next;
    });
  }, []);

  const setExpandFabPosition = useCallback(
    (expandFab: DeviceNavLayout["expandFab"]) => {
      if (!expandFab) return;
      applyLayout({ expandFab });
    },
    [applyLayout],
  );

  return { layout, setWidth, setPosition, toggleCollapsed, setExpandFabPosition };
}
