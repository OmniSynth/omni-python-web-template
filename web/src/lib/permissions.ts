import type { PermissionInfo } from "@/types/auth";

const STRUCTURE_KINDS = new Set(["catalog", "menu"]);

/** 收集树中全部节点（含子节点）。 */
export function flattenPermissionTree(nodes: PermissionInfo[]): PermissionInfo[] {
  const result: PermissionInfo[] = [];
  function walk(list: PermissionInfo[]) {
    for (const node of list) {
      result.push(node);
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

/** 仅保留目录与菜单层级的树结构。 */
export function toCatalogMenuTree(nodes: PermissionInfo[]): PermissionInfo[] {
  return nodes
    .filter((node) => STRUCTURE_KINDS.has(node.kind))
    .map((node) => ({
      ...node,
      children: toCatalogMenuTree(node.children.filter((child) => STRUCTURE_KINDS.has(child.kind))),
    }));
}

export interface ButtonOption {
  code: string;
  name: string;
  menuCode: string;
  menuName: string;
}

export interface MenuSelectionChangeOptions {
  /** 勾选时为这些菜单自动补齐其下全部按钮。 */
  fillMenuButtons?: string[];
}

/** 收集全部按钮权限，并标注所属菜单。 */
export function collectButtonOptions(tree: PermissionInfo[]): ButtonOption[] {
  const options: ButtonOption[] = [];

  function walk(nodes: PermissionInfo[], parentMenu: PermissionInfo | null) {
    for (const node of nodes) {
      const menu = node.kind === "menu" ? node : parentMenu;
      if (node.kind === "button" && menu) {
        options.push({
          code: node.code,
          name: node.name,
          menuCode: menu.code,
          menuName: menu.name,
        });
      }
      if (node.children.length > 0) {
        walk(node.children, menu);
      }
    }
  }

  walk(tree, null);
  return options.sort((a, b) => a.menuName.localeCompare(b.menuName, "zh-CN") || a.name.localeCompare(b.name, "zh-CN"));
}

/** 按已选菜单过滤按钮选项；未选菜单时返回空列表。 */
export function filterButtonOptionsByMenus(options: ButtonOption[], menuCodes: string[]): ButtonOption[] {
  if (menuCodes.length === 0) return [];
  const allowed = new Set(menuCodes);
  return options.filter((item) => allowed.has(item.menuCode));
}

/** 按已选菜单过滤按钮勾选。 */
export function filterButtonCodesByMenus(
  buttonCodes: string[],
  options: ButtonOption[],
  menuCodes: string[],
): string[] {
  if (menuCodes.length === 0) return [];
  const allowed = new Set(filterButtonOptionsByMenus(options, menuCodes).map((item) => item.code));
  return buttonCodes.filter((code) => allowed.has(code));
}

/** 更新某菜单下的按钮勾选，保留其他菜单已选按钮。 */
export function mergeButtonsForMenu(
  menuCode: string,
  menuButtonCodes: string[],
  allSelectedButtons: string[],
  options: ButtonOption[],
): string[] {
  const others = allSelectedButtons.filter((code) => {
    const item = options.find((option) => option.code === code);
    return item?.menuCode !== menuCode;
  });
  return [...others, ...menuButtonCodes];
}

/** 收集目录/节点下全部菜单 code（含嵌套目录）。 */
export function collectMenuCodesUnderNode(node: PermissionInfo): string[] {
  if (node.kind === "menu") return [node.code];
  const codes: string[] = [];
  for (const child of node.children) {
    if (STRUCTURE_KINDS.has(child.kind)) {
      codes.push(...collectMenuCodesUnderNode(child));
    }
  }
  return codes;
}

/** 目录勾选状态：全选 / 部分 / 未选（含其下菜单与按钮）。 */
export function catalogAssignmentState(
  tree: PermissionInfo[],
  node: PermissionInfo,
  selectedMenus: string[],
  selectedButtons: string[],
): boolean | "indeterminate" {
  const menuCodes = collectMenuCodesUnderNode(node);
  if (menuCodes.length === 0) return false;
  const buttonCodes = collectButtonCodesForMenus(tree, menuCodes);
  const menusSelected = menuCodes.filter((code) => selectedMenus.includes(code)).length;
  const buttonsSelected = buttonCodes.filter((code) => selectedButtons.includes(code)).length;
  const menusFull = menusSelected === menuCodes.length;
  const buttonsFull = buttonCodes.length === 0 || buttonsSelected === buttonCodes.length;
  if (menusFull && buttonsFull) return true;
  if (menusSelected === 0 && buttonsSelected === 0) return false;
  return "indeterminate";
}

/** @deprecated 使用 catalogAssignmentState */
export function catalogCheckState(node: PermissionInfo, selectedMenus: string[]): boolean | "indeterminate" {
  const under = collectMenuCodesUnderNode(node);
  if (under.length === 0) return false;
  const selectedCount = under.filter((code) => selectedMenus.includes(code)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === under.length) return true;
  return "indeterminate";
}

/** 菜单勾选状态：含按钮半选。 */
export function menuAssignmentState(
  tree: PermissionInfo[],
  menuCode: string,
  selectedMenus: string[],
  selectedButtons: string[],
): boolean | "indeterminate" {
  if (!selectedMenus.includes(menuCode)) return false;
  const buttonCodes = codesForMenuButtons(tree, menuCode);
  if (buttonCodes.length === 0) return true;
  const selectedCount = buttonCodes.filter((code) => selectedButtons.includes(code)).length;
  if (selectedCount === 0 || selectedCount === buttonCodes.length) return true;
  return "indeterminate";
}

/** 收集若干菜单下的全部按钮 code。 */
export function collectButtonCodesForMenus(tree: PermissionInfo[], menuCodes: string[]): string[] {
  const codes = new Set<string>();
  for (const menuCode of menuCodes) {
    for (const code of codesForMenuButtons(tree, menuCode)) {
      codes.add(code);
    }
  }
  return [...codes];
}

/** 切换目录下全部菜单勾选。 */
export function toggleCatalogSelection(node: PermissionInfo, selectedMenus: string[], checked: boolean): string[] {
  const under = collectMenuCodesUnderNode(node);
  const set = new Set(selectedMenus);
  for (const code of under) {
    if (checked) set.add(code);
    else set.delete(code);
  }
  return [...set];
}

/** 收集权限树中全部菜单 code。 */
export function collectAllMenuCodes(tree: PermissionInfo[]): string[] {
  return flattenPermissionTree(toCatalogMenuTree(tree))
    .filter((node) => node.kind === "menu")
    .map((node) => node.code);
}

/** 收集权限树中全部按钮 code。 */
export function collectAllButtonCodes(tree: PermissionInfo[]): string[] {
  return collectButtonOptions(tree).map((item) => item.code);
}

/** 某菜单下全部按钮 code。 */
export function codesForMenuButtons(tree: PermissionInfo[], menuCode: string): string[] {
  return buttonsUnderMenu(tree, menuCode).map((node) => node.code);
}

/** 一次全选：全部菜单 + 全部按钮。 */
export function buildSelectAllAssignment(tree: PermissionInfo[]): {
  menus: string[];
  buttons: string[];
} {
  return {
    menus: collectAllMenuCodes(tree),
    buttons: collectAllButtonCodes(tree),
  };
}

/** 菜单与按钮是否均已全选。 */
export function isFullAssignmentSelected(
  tree: PermissionInfo[],
  selectedMenus: string[],
  selectedButtons: string[],
): boolean {
  const allMenus = collectAllMenuCodes(tree);
  const allButtons = collectAllButtonCodes(tree);
  if (allMenus.length === 0 && allButtons.length === 0) return false;
  const menuSet = new Set(selectedMenus);
  const buttonSet = new Set(selectedButtons);
  return allMenus.every((code) => menuSet.has(code)) && allButtons.every((code) => buttonSet.has(code));
}

/** 树展示顺序下的第一个菜单 code；无菜单时返回 null。 */
export function firstMenuCode(tree: PermissionInfo[]): string | null {
  return flattenPermissionTree(toCatalogMenuTree(tree)).find((node) => node.kind === "menu")?.code ?? null;
}

/** 获取已选菜单节点（仅 kind=menu）。 */
export function getSelectedMenuNodes(tree: PermissionInfo[], menuCodes: string[]): PermissionInfo[] {
  const allowed = new Set(menuCodes);
  return flattenPermissionTree(tree).filter((node) => node.kind === "menu" && allowed.has(node.code));
}

/** 获取某菜单下的按钮节点。 */
export function buttonsUnderMenu(tree: PermissionInfo[], menuCode: string): PermissionInfo[] {
  const menu = flattenPermissionTree(tree).find((node) => node.code === menuCode && node.kind === "menu");
  if (!menu) return [];
  return menu.children.filter((child) => child.kind === "button");
}

/** 从已选按钮反推所属菜单（用于回显）。 */
export function inferMenusFromButtons(buttonCodes: string[], options: ButtonOption[]): string[] {
  const menus = new Set<string>();
  for (const code of buttonCodes) {
    const item = options.find((option) => option.code === code);
    if (item) menus.add(item.menuCode);
  }
  return [...menus];
}

/** 将已保存权限拆分为菜单与按钮勾选。 */
export function splitMenuButtonSelection(
  codes: string[],
  tree: PermissionInfo[],
): { menus: string[]; buttons: string[] } {
  const kindByCode = new Map(flattenPermissionTree(tree).map((node) => [node.code, node.kind]));
  const menus: string[] = [];
  const buttons: string[] = [];
  for (const code of codes) {
    const kind = kindByCode.get(code);
    if (kind === "menu") menus.push(code);
    if (kind === "button") buttons.push(code);
  }
  return { menus, buttons };
}

/** 合并菜单与按钮勾选。 */
export function mergeMenuButtonSelection(menus: string[], buttons: string[]): string[] {
  return [...new Set([...menus, ...buttons])];
}

/** 切换菜单勾选（仅记录菜单本身，目录在保存时自动附带）。 */
export function toggleMenuSelection(
  menuCode: string,
  _tree: PermissionInfo[],
  selectedMenus: string[],
  checked: boolean,
): string[] {
  const set = new Set(selectedMenus);
  if (checked) {
    set.add(menuCode);
  } else {
    set.delete(menuCode);
  }
  return [...set];
}

/** 将已保存权限还原为分配面板的菜单/按钮勾选（与 openPermissions 一致）。 */
export function resolveAssignmentSelection(
  codes: string[],
  tree: PermissionInfo[],
): { menus: string[]; buttons: string[] } {
  const assignable = toAssignableSelection(codes, tree);
  const { menus, buttons } = splitMenuButtonSelection(assignable, tree);
  const buttonOptions = collectButtonOptions(tree);
  const resolvedMenus = menus.length > 0 ? menus : inferMenusFromButtons(buttons, buttonOptions);
  return { menus: resolvedMenus, buttons };
}

/** 统计菜单/按钮数量（与分配权限面板「已选 N 个菜单 · M 个按钮」一致）。 */
export function countAssignmentSelection(
  codes: string[],
  tree: PermissionInfo[],
): { menuCount: number; buttonCount: number } {
  const { menus, buttons } = resolveAssignmentSelection(codes, tree);
  return { menuCount: menus.length, buttonCount: buttons.length };
}

export function formatAssignmentCount(menuCount: number, buttonCount: number): string {
  return `${menuCount} 个菜单 · ${buttonCount} 个按钮`;
}

/** 菜单 + 按钮合计（与分配面板分项计数之和一致）。 */
export function assignmentSelectionTotal(codes: string[], tree: PermissionInfo[]): number {
  const { menuCount, buttonCount } = countAssignmentSelection(codes, tree);
  return menuCount + buttonCount;
}

/** 将角色已保存的完整权限还原为树勾选状态（目录/菜单/按钮）。 */
export function toAssignableSelection(allPerms: string[], tree: PermissionInfo[]): string[] {
  const assignable = new Set(flattenPermissionTree(tree).map((n) => n.code));
  return allPerms.filter((c) => assignable.has(c));
}

/** 展开勾选权限，自动附带祖先、子节点（含接口）权限码。 */
export function expandPermissionCodes(codes: string[], tree: PermissionInfo[]): string[] {
  const nodeMap = new Map(flattenPermissionTree(tree).map((n) => [n.code, n]));
  const result = new Set<string>();
  for (const code of codes) {
    result.add(code);
    for (const ancestor of findAncestorCodes(code, tree)) {
      result.add(ancestor);
    }
    const node = nodeMap.get(code);
    if (!node) continue;
    for (const child of flattenPermissionTree([node])) {
      if (child.code !== code) {
        result.add(child.code);
      }
    }
    for (const api of node.api_codes) {
      result.add(api);
    }
  }
  return [...result].sort();
}

/** 查找某节点全部祖先 code。 */
export function findAncestorCodes(targetCode: string, tree: PermissionInfo[]): string[] {
  const ancestors: string[] = [];
  function walk(nodes: PermissionInfo[], chain: string[]): boolean {
    for (const n of nodes) {
      if (n.code === targetCode) {
        ancestors.push(...chain);
        return true;
      }
      if (walk(n.children, [...chain, n.code])) {
        return true;
      }
    }
    return false;
  }
  walk(tree, []);
  return ancestors;
}

/** 按 sort_order 与 code 稳定排序。 */
export function sortByOrder<T extends { code: string; sort_order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.code.localeCompare(b.code, "zh-CN"));
}

export const KIND_LABEL: Record<string, string> = {
  catalog: "目录",
  menu: "菜单",
  button: "按钮",
  api: "接口",
};
