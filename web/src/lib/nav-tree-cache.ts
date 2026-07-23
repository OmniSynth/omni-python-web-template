/** 设备级导航树缓存（侧栏防刷新抖动；登出清除）。 */

import { sortByOrder } from "@/lib/permissions";
import type { PermissionInfo } from "@/types/auth";

export const DEVICE_NAV_TREE_KEY = "omni-nav-tree";

interface CachedNavTree {
  user_id: number;
  tenant_id: number | null;
  navTree: PermissionInfo[];
}

function isPermissionInfo(value: unknown): value is PermissionInfo {
  if (!value || typeof value !== "object") return false;
  const row = value as PermissionInfo;
  return typeof row.code === "string" && typeof row.name === "string" && Array.isArray(row.children);
}

function isCachedNavTree(value: unknown): value is CachedNavTree {
  if (!value || typeof value !== "object") return false;
  const row = value as CachedNavTree;
  return (
    typeof row.user_id === "number" &&
    (row.tenant_id === null || typeof row.tenant_id === "number") &&
    Array.isArray(row.navTree) &&
    row.navTree.every(isPermissionInfo)
  );
}

/** 按 DB sort_order 稳定排序目录与子菜单。 */
export function sortNavTreeByOrder(tree: PermissionInfo[]): PermissionInfo[] {
  return sortByOrder(tree).map((node) => {
    const children = node.children?.length ? sortNavTreeByOrder(node.children) : (node.children ?? []);
    if (children === node.children) return node;
    return { ...node, children };
  });
}

function normalizeNavTreeForCompare(tree: PermissionInfo[]): string {
  const walk = (nodes: PermissionInfo[]): unknown[] =>
    sortByOrder(nodes).map((node) => ({
      code: node.code,
      name: node.name,
      kind: node.kind,
      sort_order: node.sort_order ?? 0,
      route_path: node.route_path ?? null,
      component_key: node.component_key ?? null,
      children: walk(node.children ?? []),
    }));
  return JSON.stringify(walk(tree));
}

/** 规范化导航树：按 sort_order 排序，供展示与持久化使用。 */
export function normalizeNavTree(tree: PermissionInfo[]): PermissionInfo[] {
  return sortNavTreeByOrder(tree);
}

/** 比较导航树展示结构（目录/菜单顺序、名称、路由）。 */
export function navTreesEqual(a: PermissionInfo[], b: PermissionInfo[]): boolean {
  return normalizeNavTreeForCompare(a) === normalizeNavTreeForCompare(b);
}

/** 同步读取当前用户/租户对应的导航树。 */
export function readDeviceNavTree(userId: number, tenantId: number | null | undefined): PermissionInfo[] | null {
  try {
    const raw = localStorage.getItem(DEVICE_NAV_TREE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCachedNavTree(parsed)) return null;
    const expectedTenant = tenantId ?? null;
    if (parsed.user_id !== userId || parsed.tenant_id !== expectedTenant) return null;
    return parsed.navTree;
  } catch {
    return null;
  }
}

export function writeDeviceNavTree(
  userId: number,
  tenantId: number | null | undefined,
  navTree: PermissionInfo[],
): void {
  try {
    const payload: CachedNavTree = {
      user_id: userId,
      tenant_id: tenantId ?? null,
      navTree,
    };
    localStorage.setItem(DEVICE_NAV_TREE_KEY, JSON.stringify(payload));
  } catch {
    /* 忽略 */
  }
}

export function clearDeviceNavTree(): void {
  try {
    localStorage.removeItem(DEVICE_NAV_TREE_KEY);
  } catch {
    /* 忽略 */
  }
}

/** 合并 Dexie 与设备级缓存；不一致时优先 device（通常由上次 refresh 写入）。 */
export function resolveHydratedNavTree(
  userId: number,
  tenantId: number | null | undefined,
  idbNavTree: PermissionInfo[] | undefined,
): PermissionInfo[] {
  const fromIdb = idbNavTree?.length ? normalizeNavTree(idbNavTree) : [];
  const fromDeviceRaw = readDeviceNavTree(userId, tenantId);
  const fromDevice = fromDeviceRaw?.length ? normalizeNavTree(fromDeviceRaw) : [];

  if (fromIdb.length === 0) {
    return fromDevice;
  }
  if (fromDevice.length === 0) {
    return fromIdb;
  }
  if (navTreesEqual(fromIdb, fromDevice)) {
    return fromIdb;
  }
  return fromDevice;
}
