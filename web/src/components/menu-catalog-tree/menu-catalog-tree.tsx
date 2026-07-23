import { type MenuSelectionChangeOptions, toCatalogMenuTree } from "@/lib/permissions";
import type { PermissionInfo } from "@/types/auth";
import { MenuCatalogTreeNode } from "./menu-catalog-tree-node";

interface MenuCatalogTreeProps {
  tree: PermissionInfo[];
  mode: "nav" | "assign";
  selectedCode?: string | null;
  selectedMenus?: string[];
  selectedButtons?: string[];
  onSelect?: (code: string) => void;
  onMenusChange?: (menus: string[], options?: MenuSelectionChangeOptions) => void;
  onMove?: (dragCode: string, targetCode: string) => void;
  dragEnabled?: boolean;
  assignDisabled?: boolean;
}

export function MenuCatalogTree({
  tree,
  mode,
  selectedCode = null,
  selectedMenus = [],
  selectedButtons = [],
  onSelect,
  onMenusChange,
  onMove,
  dragEnabled = false,
  assignDisabled = false,
}: MenuCatalogTreeProps) {
  const catalogMenuTree = toCatalogMenuTree(tree);

  if (catalogMenuTree.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无目录或菜单</p>;
  }

  return (
    <div className="grid gap-1">
      {catalogMenuTree.map((node) => (
        <MenuCatalogTreeNode
          key={node.code}
          node={node}
          tree={tree}
          mode={mode}
          depth={0}
          selectedCode={selectedCode}
          selectedMenus={selectedMenus}
          selectedButtons={selectedButtons}
          onSelect={onSelect}
          onMenusChange={onMenusChange}
          onMove={onMove}
          dragEnabled={dragEnabled}
          assignDisabled={assignDisabled}
        />
      ))}
    </div>
  );
}
