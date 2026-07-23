import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import type { MenuSelectionChangeOptions } from "@/lib/permissions";
import { KIND_LABEL } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { PermissionInfo } from "@/types/auth";
import { MenuCatalogTreeNodeCheckboxes } from "./menu-catalog-tree-node-checkboxes";

interface MenuCatalogTreeNodeRowProps {
  node: PermissionInfo;
  tree: PermissionInfo[];
  mode: "nav" | "assign";
  depth: number;
  selectedCode?: string | null;
  selectedMenus: string[];
  selectedButtons: string[];
  expanded: boolean;
  dragEnabled: boolean;
  assignDisabled?: boolean;
  onSelect?: (code: string) => void;
  onMenusChange?: (menus: string[], options?: MenuSelectionChangeOptions) => void;
  onMove?: (dragCode: string, targetCode: string) => void;
  onToggleExpanded: () => void;
}

export function MenuCatalogTreeNodeRow({
  node,
  tree,
  mode,
  depth,
  selectedCode,
  selectedMenus,
  selectedButtons,
  expanded,
  dragEnabled,
  assignDisabled,
  onSelect,
  onMenusChange,
  onMove,
  onToggleExpanded,
}: MenuCatalogTreeNodeRowProps) {
  const hasChildren = node.children.length > 0;
  const isMenu = node.kind === "menu";
  const isNavSelected = mode === "nav" && selectedCode === node.code;
  const isAssignActive = mode === "assign" && isMenu && selectedCode === node.code;

  const kindBadge = (
    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
      {KIND_LABEL[node.kind] ?? node.kind}
    </span>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40",
        depth > 0 && "ml-4",
        (isNavSelected || isAssignActive) && "bg-muted",
        node.enabled === false && "opacity-50",
      )}
      onDragOver={(event) => {
        if (!dragEnabled || mode !== "nav") return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!dragEnabled || mode !== "nav") return;
        event.preventDefault();
        const dragCode = event.dataTransfer.getData("text/plain");
        if (dragCode) onMove?.(dragCode, node.code);
      }}
    >
      {mode === "nav" ? (
        <button
          type="button"
          draggable={dragEnabled}
          className={cn(
            "shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing",
            !dragEnabled && "cursor-not-allowed opacity-40",
          )}
          aria-label="拖动排序"
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", node.code);
            event.dataTransfer.effectAllowed = "move";
          }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      {hasChildren ? (
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "收起" : "展开"}
          onClick={onToggleExpanded}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      <MenuCatalogTreeNodeCheckboxes
        node={node}
        tree={tree}
        mode={mode}
        selectedMenus={selectedMenus}
        selectedButtons={selectedButtons}
        assignDisabled={assignDisabled}
        onMenusChange={onMenusChange}
      />

      {mode === "nav" || isMenu ? (
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onSelect?.(node.code)}
        >
          {kindBadge}
          <span className="truncate">{node.name}</span>
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {kindBadge}
          <span className="truncate">{node.name}</span>
        </span>
      )}
    </div>
  );
}
