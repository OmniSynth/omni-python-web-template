import { Checkbox } from "@/components/ui/checkbox";
import {
  catalogAssignmentState,
  collectMenuCodesUnderNode,
  type MenuSelectionChangeOptions,
  menuAssignmentState,
  toggleCatalogSelection,
  toggleMenuSelection,
} from "@/lib/permissions";
import type { PermissionInfo } from "@/types/auth";

interface MenuCatalogTreeNodeCheckboxesProps {
  node: PermissionInfo;
  tree: PermissionInfo[];
  mode: "nav" | "assign";
  selectedMenus: string[];
  selectedButtons: string[];
  assignDisabled?: boolean;
  onMenusChange?: (menus: string[], options?: MenuSelectionChangeOptions) => void;
}

export function MenuCatalogTreeNodeCheckboxes({
  node,
  tree,
  mode,
  selectedMenus,
  selectedButtons,
  assignDisabled,
  onMenusChange,
}: MenuCatalogTreeNodeCheckboxesProps) {
  const isCatalog = node.kind === "catalog";
  const isMenu = node.kind === "menu";
  const isMenuChecked = isMenu ? menuAssignmentState(tree, node.code, selectedMenus, selectedButtons) : false;
  const catalogMenus = isCatalog ? collectMenuCodesUnderNode(node) : [];
  const showCatalogCheckbox = mode === "assign" && isCatalog && catalogMenus.length > 0;
  const catalogChecked = showCatalogCheckbox
    ? catalogAssignmentState(tree, node, selectedMenus, selectedButtons)
    : false;

  return (
    <>
      {showCatalogCheckbox ? (
        <Checkbox
          className="shrink-0"
          disabled={assignDisabled}
          checked={catalogChecked === true || catalogChecked === "indeterminate"}
          indeterminate={catalogChecked === "indeterminate"}
          onCheckedChange={(checked) => {
            const nextMenus = toggleCatalogSelection(node, selectedMenus, checked);
            const options: MenuSelectionChangeOptions | undefined = checked
              ? { fillMenuButtons: catalogMenus }
              : undefined;
            onMenusChange?.(nextMenus, options);
          }}
        />
      ) : null}

      {mode === "assign" && isMenu ? (
        <Checkbox
          className="shrink-0"
          disabled={assignDisabled}
          checked={isMenuChecked === true || isMenuChecked === "indeterminate"}
          indeterminate={isMenuChecked === "indeterminate"}
          onCheckedChange={(checked) => {
            const nextMenus = toggleMenuSelection(node.code, tree, selectedMenus, checked);
            const options: MenuSelectionChangeOptions | undefined = checked
              ? { fillMenuButtons: [node.code] }
              : undefined;
            onMenusChange?.(nextMenus, options);
          }}
        />
      ) : null}
    </>
  );
}
