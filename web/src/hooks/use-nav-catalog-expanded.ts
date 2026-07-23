import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { catalogForPath } from "@/components/layout/SidebarNav";
import { readDeviceNavExpanded, writeDeviceNavExpanded } from "@/lib/nav-expanded-cache";
import type { AuthUser, PermissionInfo } from "@/types/auth";

export function useNavCatalogExpanded(user: AuthUser | null, navTree: PermissionInfo[]) {
  const location = useLocation();
  const activeCatalog = catalogForPath(navTree, location.pathname);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const cached = user ? readDeviceNavExpanded(user.id, user.tenant_id) : [];
    const code = activeCatalog ?? cached[0];
    return code ? new Set([code]) : new Set();
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅租户切换时重载目录展开缓存
  useEffect(() => {
    if (!user) return;
    const cached = readDeviceNavExpanded(user.id, user.tenant_id);
    const active = catalogForPath(navTree, location.pathname);
    const code = active ?? cached[0];
    setExpanded(code ? new Set([code]) : new Set());
  }, [user?.id, user?.tenant_id]);

  useEffect(() => {
    if (!user) return;
    writeDeviceNavExpanded(user.id, user.tenant_id, expanded);
  }, [expanded, user]);

  useEffect(() => {
    if (!activeCatalog) return;
    setExpanded((prev) => {
      if (prev.size === 1 && prev.has(activeCatalog)) return prev;
      return new Set([activeCatalog]);
    });
  }, [activeCatalog]);

  /** 手风琴：展开某一目录时折叠其余目录。 */
  function toggleCatalog(code: string) {
    setExpanded((prev) => {
      if (prev.has(code)) {
        const next = new Set(prev);
        next.delete(code);
        return next;
      }
      return new Set([code]);
    });
  }

  return { expanded, activeCatalog, toggleCatalog };
}
