import { useEffect, useMemo, useState } from "react";
import { BulkSelectLinks } from "@/components/form/BulkSelectLinks";
import { MenuCatalogTree } from "@/components/menu-catalog-tree";
import { Label } from "@/components/ui/label";
import {
  buildSelectAllAssignment,
  codesForMenuButtons,
  collectButtonOptions,
  filterButtonCodesByMenus,
  firstMenuCode,
  formatAssignmentCount,
  getSelectedMenuNodes,
  isFullAssignmentSelected,
  type MenuSelectionChangeOptions,
  mergeButtonsForMenu,
  mergeMenuButtonSelection,
} from "@/lib/permissions";
import type { PermissionInfo } from "@/types/auth";
import { ButtonPermissionSelect } from "./button-permission-select";

interface PermissionAssignPanelProps {
  tree: PermissionInfo[];
  selectedMenus: string[];
  selectedButtons: string[];
  onMenusChange: (menus: string[]) => void;
  onButtonsChange: (buttons: string[]) => void;
  disabled?: boolean;
}

export function PermissionAssignPanel({
  tree,
  selectedMenus,
  selectedButtons,
  onMenusChange,
  onButtonsChange,
  disabled = false,
}: PermissionAssignPanelProps) {
  const [activeMenuCode, setActiveMenuCode] = useState<string | null>(() => firstMenuCode(tree));
  const buttonOptions = useMemo(() => collectButtonOptions(tree), [tree]);
  const allSelected = useMemo(
    () => isFullAssignmentSelected(tree, selectedMenus, selectedButtons),
    [tree, selectedMenus, selectedButtons],
  );
  const activeMenu = useMemo(
    () => (activeMenuCode ? (getSelectedMenuNodes(tree, [activeMenuCode])[0] ?? null) : null),
    [activeMenuCode, tree],
  );
  const activeMenuOptions = useMemo(
    () => (activeMenuCode ? buttonOptions.filter((item) => item.menuCode === activeMenuCode) : []),
    [activeMenuCode, buttonOptions],
  );
  const activeMenuSelectedButtons = useMemo(() => {
    const allowed = new Set(activeMenuOptions.map((item) => item.code));
    return selectedButtons.filter((code) => allowed.has(code));
  }, [activeMenuOptions, selectedButtons]);

  useEffect(() => {
    setActiveMenuCode((current) => {
      if (current && getSelectedMenuNodes(tree, [current]).length > 0) {
        return current;
      }
      return firstMenuCode(tree);
    });
  }, [tree]);

  function handleMenusChange(menus: string[], options?: MenuSelectionChangeOptions) {
    let nextButtons = filterButtonCodesByMenus(selectedButtons, buttonOptions, menus);
    if (options?.fillMenuButtons) {
      for (const menuCode of options.fillMenuButtons) {
        if (!menus.includes(menuCode)) continue;
        nextButtons = [...new Set([...nextButtons, ...codesForMenuButtons(tree, menuCode)])];
      }
    }
    onMenusChange(menus);
    const changed =
      nextButtons.length !== selectedButtons.length ||
      nextButtons.some((code) => !selectedButtons.includes(code)) ||
      selectedButtons.some((code) => !nextButtons.includes(code));
    if (changed) {
      onButtonsChange(nextButtons);
    }
  }

  function handleActiveMenuButtonsChange(codes: string[]) {
    if (!activeMenuCode) return;
    onButtonsChange(mergeButtonsForMenu(activeMenuCode, codes, selectedButtons, buttonOptions));
  }

  function handleToggleAll() {
    if (allSelected) {
      onMenusChange([]);
      onButtonsChange([]);
      return;
    }
    const { menus, buttons } = buildSelectAllAssignment(tree);
    onMenusChange(menus);
    onButtonsChange(buttons);
  }

  return (
    <div className="grid gap-4 border-t border-border pt-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label>菜单权限</Label>
          <BulkSelectLinks allSelected={allSelected} disabled={disabled} onToggle={handleToggleAll} />
        </div>
        <p className="text-xs text-muted-foreground">
          已选 {formatAssignmentCount(selectedMenus.length, selectedButtons.length)}
          。勾选目录或菜单将自动选中其下按钮；点击菜单名称可微调按钮。
        </p>
        <div className="surface-glass rounded-md border p-2">
          <MenuCatalogTree
            tree={tree}
            mode="assign"
            selectedCode={activeMenuCode}
            selectedMenus={selectedMenus}
            selectedButtons={selectedButtons}
            onSelect={setActiveMenuCode}
            onMenusChange={handleMenusChange}
            assignDisabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>按钮权限</Label>
        {!activeMenu ? (
          <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            请点击上方菜单名称，再选择该菜单下的按钮
          </p>
        ) : (
          <div className="grid gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{activeMenu.name}</p>
            <ButtonPermissionSelect
              options={activeMenuOptions}
              selected={activeMenuSelectedButtons}
              onChange={handleActiveMenuButtonsChange}
              disabled={disabled}
              emptyHint="该菜单下暂无按钮"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">按钮区仅展示当前点击的菜单；保存时接口权限将自动附带。</p>
      </div>
    </div>
  );
}

export function mergeAssignSelection(menus: string[], buttons: string[]): string[] {
  return mergeMenuButtonSelection(menus, buttons);
}
