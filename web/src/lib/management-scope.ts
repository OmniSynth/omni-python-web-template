import { useLocation } from "react-router-dom";

/** 平台/系统管理页路径前缀（与 permission_seed 中 route_path 一致）。 */
export const SYSTEM_MANAGEMENT_PREFIX = "/sys/";

export function isSystemManagementPath(pathname: string): boolean {
  return pathname.startsWith(SYSTEM_MANAGEMENT_PREFIX);
}

/**
 * 根据路由区分租户域 / 平台域管理页。
 * 设置目录：/users、/roles、/depts；系统目录：/sys/*。
 */
export function useManagementScope(): "tenant" | "system" {
  const { pathname } = useLocation();
  return isSystemManagementPath(pathname) ? "system" : "tenant";
}
