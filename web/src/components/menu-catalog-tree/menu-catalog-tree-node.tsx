import { useState } from "react";
import type { MenuSelectionChangeOptions } from "@/lib/permissions";
import type { PermissionInfo } from "@/types/auth";
import { MenuCatalogTreeNodeRow } from "./menu-catalog-tree-node-row";

export interface MenuCatalogTreeNodeProps {
  node: PermissionInfo;
  tree: PermissionInfo[];
  mode: "nav" | "assign";
  depth: number;
  selectedCode?: string | null;
  selectedMenus: string[];
  selectedButtons: string[];
  onSelect?: (code: string) => void;
  onMenusChange?: (menus: string[], options?: MenuSelectionChangeOptions) => void;
  onMove?: (dragCode: string, targetCode: string) => void;
  dragEnabled: boolean;
  assignDisabled?: boolean;
}

export function MenuCatalogTreeNode({
  node,
  tree,
  mode,
  depth,
  selectedCode,
  selectedMenus,
  selectedButtons = [],
  onSelect,
  onMenusChange,
  onMove,
  dragEnabled,
  assignDisabled,
}: MenuCatalogTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <MenuCatalogTreeNodeRow
        node={node}
        tree={tree}
        mode={mode}
        depth={depth}
        selectedCode={selectedCode}
        selectedMenus={selectedMenus}
        selectedButtons={selectedButtons}
        expanded={expanded}
        dragEnabled={dragEnabled}
        assignDisabled={assignDisabled}
        onSelect={onSelect}
        onMenusChange={onMenusChange}
        onMove={onMove}
        onToggleExpanded={() => setExpanded((value) => !value)}
      />

      {hasChildren && expanded ? (
        <div className="mt-1 grid gap-1">
          {node.children.map((child) => (
            <MenuCatalogTreeNode
              key={child.code}
              node={child}
              tree={tree}
              mode={mode}
              depth={depth + 1}
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
      ) : null}
    </div>
  );
}
