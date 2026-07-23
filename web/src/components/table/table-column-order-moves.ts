/** 列设置抽屉内的键盘/按钮排序逻辑。 */

export function moveColumnByKeyboard(
  ids: string[],
  id: string,
  direction: -1 | 1,
  actionIds: string[],
): string[] | null {
  if (actionIds.includes(id)) return null;
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  if (actionIds.includes(ids[to])) return null;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function moveColumnByAction(
  ids: string[],
  id: string,
  action: "top" | "up" | "down" | "bottom",
  actionIds: string[],
): string[] | null {
  if (actionIds.includes(id)) return null;
  const from = ids.indexOf(id);
  if (from < 0) return null;

  let to = from;
  if (action === "top") to = 0;
  else if (action === "up") to = from - 1;
  else if (action === "down") to = from + 1;
  else to = ids.length - actionIds.length - 1;

  if (to === from || to < 0 || to >= ids.length) return null;
  if (actionIds.includes(ids[to])) return null;

  const next = [...ids];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
