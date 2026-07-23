import type { PermissionInfo } from "@/types/auth";

export type VisibleNavMenuItem = {
  catalogCode: string;
  catalogName: string;
  code: string;
  name: string;
  routePath: string;
  componentKey?: string | null;
};

export type VisibleNavCatalog = {
  code: string;
  name: string;
  menus: VisibleNavMenuItem[];
};

export function collectVisibleNavCatalogs(
  navTree: PermissionInfo[],
  hasPermission: (code: string) => boolean,
): VisibleNavCatalog[] {
  const catalogs: VisibleNavCatalog[] = [];
  for (const catalog of navTree) {
    const menus: VisibleNavMenuItem[] = [];
    for (const menu of catalog.children) {
      if (menu.kind !== "menu") continue;
      const routePath = menu.route_path;
      if (!routePath || !hasPermission(menu.code)) continue;
      menus.push({
        catalogCode: catalog.code,
        catalogName: catalog.name,
        code: menu.code,
        name: menu.name,
        routePath,
        componentKey: menu.component_key,
      });
    }
    if (menus.length === 0) continue;
    catalogs.push({ code: catalog.code, name: catalog.name, menus });
  }
  return catalogs;
}

export function collectVisibleNavMenus(
  navTree: PermissionInfo[],
  hasPermission: (code: string) => boolean,
): VisibleNavMenuItem[] {
  return collectVisibleNavCatalogs(navTree, hasPermission).flatMap((catalog) => catalog.menus);
}

/** 登录后默认首页：权限树中第一个可见目录下的第一个可见菜单（与侧栏顺序一致，来自 DB sort_order）。 */
export function resolveDefaultHomePath(
  navTree: PermissionInfo[],
  hasPermission: (code: string) => boolean,
): string | null {
  const first = collectVisibleNavMenus(navTree, hasPermission)[0];
  if (!first?.routePath) return null;
  const path = first.routePath.trim();
  if (!path) return null;
  return path.startsWith("/") ? path : `/${path}`;
}
