import { flattenDeptRecords } from "@/components/dept/dept-tree-picker";
import type { DeptRecord } from "@/types/auth";

export function collectDescendantIds(tree: DeptRecord[], rootId: number): Set<number> {
  const flat = flattenDeptRecords(tree);
  const childrenMap = new Map<number, number[]>();
  for (const dept of flat) {
    const siblings = childrenMap.get(dept.parent_id) ?? [];
    siblings.push(dept.id);
    childrenMap.set(dept.parent_id, siblings);
  }
  const ids = new Set<number>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    ids.add(current);
    stack.push(...(childrenMap.get(current) ?? []));
  }
  return ids;
}

export function nextSortOrder(flat: DeptRecord[], parentId: number): number {
  const siblings = flat.filter((dept) => dept.parent_id === parentId);
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((dept) => dept.sort_order)) + 1;
}

export function firstDeptId(tree: DeptRecord[]): number | null {
  const flat = flattenDeptRecords(tree);
  return flat[0]?.id ?? null;
}
