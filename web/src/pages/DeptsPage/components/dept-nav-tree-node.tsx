import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { useState } from "react";
import { formatParentLabel } from "@/components/dept/dept-tree-picker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DeptRecord } from "@/types/auth";

type DeptNavTreeNodeProps = {
  node: DeptRecord;
  depth: number;
  selectedId: number | null;
  dragEnabled: boolean;
  parentNameById: Map<number, string>;
  onSelect: (dept: DeptRecord) => void;
  onMove: (dragId: number, targetId: number) => void;
};

export function DeptNavTreeNode({
  node,
  depth,
  selectedId,
  dragEnabled,
  parentNameById,
  onSelect,
  onMove,
}: DeptNavTreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40",
          depth > 0 && "ml-4",
          isSelected && "bg-muted",
          !node.enabled && "opacity-60",
        )}
        onClick={() => onSelect(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node);
          }
        }}
        onDragOver={(event) => {
          if (!dragEnabled) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (!dragEnabled) return;
          event.preventDefault();
          event.stopPropagation();
          const raw = event.dataTransfer.getData("text/plain");
          const dragId = Number(raw);
          if (Number.isFinite(dragId) && dragId > 0) {
            onMove(dragId, node.id);
          }
        }}
      >
        <button
          type="button"
          draggable={dragEnabled}
          className={cn(
            "shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing",
            !dragEnabled && "cursor-not-allowed opacity-40",
          )}
          aria-label="拖动排序"
          onClick={(event) => event.stopPropagation()}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.setData("text/plain", String(node.id));
            event.dataTransfer.effectAllowed = "move";
          }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "收起" : "展开"}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {node.parent_id !== 0 ? (
          <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
            {formatParentLabel(parentNameById.get(node.parent_id))}
          </span>
        ) : null}
        {!node.enabled ? (
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            已禁用
          </Badge>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <div>
          {node.children!.map((child) => (
            <DeptNavTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              dragEnabled={dragEnabled}
              parentNameById={parentNameById}
              onSelect={onSelect}
              onMove={onMove}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
