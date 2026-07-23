import type { PermissionInfo } from "@/types/auth";

export function permissionTreeForRoleType(
  roleType: "system" | "tenant" | undefined,
  systemTree: PermissionInfo[],
  tenantTree: PermissionInfo[],
): PermissionInfo[] {
  return roleType === "system" ? systemTree : tenantTree;
}
