import type { SortOrder } from "@/types/table-preference";

export function buildSortQuery(sortBy?: string | null, sortOrder?: SortOrder | null): string {
  if (!sortBy) return "";
  const params = new URLSearchParams();
  params.set("sort_by", sortBy);
  if (sortOrder) params.set("sort_order", sortOrder);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function sortKeyFromPreference(
  sort: { columnId: string; order: SortOrder } | null | undefined,
  columns: Array<{ id: string; sortKey?: string }>,
): { sort_by?: string; sort_order?: SortOrder } {
  if (!sort) return {};
  const col = columns.find((c) => c.id === sort.columnId);
  const sortBy = col?.sortKey ?? sort.columnId;
  return { sort_by: sortBy, sort_order: sort.order };
}
