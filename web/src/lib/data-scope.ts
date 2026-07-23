import { api } from "@/lib/api";
import type { DeptRecord, RoleDataScopeItem } from "@/types/auth";

export const DATA_SCOPE_LABELS: Record<number, string> = {
  1: "仅本人",
  2: "本部门",
  3: "本部门及以下",
  4: "自定义",
};

/** 新建用户/角色时的默认数据权限：本部门及以下 */
export const DEFAULT_DATA_SCOPE = 3;

export function formatDataScopeLabel(scope: number | null | undefined): string {
  return DATA_SCOPE_LABELS[scope ?? DEFAULT_DATA_SCOPE] ?? "—";
}

export function formatDataScopeSummary(scope: number | null | undefined, customScopes?: RoleDataScopeItem[]): string {
  const label = formatDataScopeLabel(scope);
  if (scope === 4 && customScopes?.length) {
    const deptCount = customScopes.filter((item) => item.scope_type === "dept").length;
    if (deptCount > 0) return `${label}（${deptCount} 部门）`;
  }
  return label;
}

export function deptIdsFromScopes(scopes: RoleDataScopeItem[] | undefined): Set<number> {
  return new Set((scopes ?? []).filter((item) => item.scope_type === "dept").map((item) => item.scope_id));
}

export function customScopesFromDeptIds(ids: Iterable<number>): { scope_type: "dept"; scope_id: number }[] {
  return [...ids].map((id) => ({ scope_type: "dept" as const, scope_id: id }));
}

export function validateDataScopeSelection(dataScope: number, selectedDeptIds: Set<number>): string | null {
  if (dataScope === 4 && selectedDeptIds.size === 0) {
    return "自定义数据权限须至少选择一个部门";
  }
  return null;
}

function collectSubtreeIds(node: DeptRecord): number[] {
  const ids = [node.id];
  for (const child of node.children ?? []) {
    ids.push(...collectSubtreeIds(child));
  }
  return ids;
}

/** 部门 id → 自身及全部下级 id（用于自定义范围级联勾选）。 */
export function buildDeptSubtreeIdMap(tree: DeptRecord[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  function walk(nodes: DeptRecord[]) {
    for (const node of nodes) {
      map.set(node.id, collectSubtreeIds(node));
      if (node.children?.length) {
        walk(node.children);
      }
    }
  }
  walk(tree);
  return map;
}

/** 勾选/取消部门时同步下级；选中上级自动勾选全部下级，取消上级同步取消下级。 */
export function toggleDeptScopeCascade(
  selected: Iterable<number>,
  deptId: number,
  checked: boolean,
  tree: DeptRecord[],
): Set<number> {
  const next = new Set(selected);
  const ids = buildDeptSubtreeIdMap(tree).get(deptId) ?? [deptId];
  for (const id of ids) {
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
  }
  return next;
}

export async function loadDeptTreeForScope(options: {
  tenantScope: boolean;
  tenantId?: number;
}): Promise<DeptRecord[]> {
  try {
    return options.tenantScope ? await api.tenantDepts.tree() : await api.depts.tree(options.tenantId);
  } catch {
    return [];
  }
}
