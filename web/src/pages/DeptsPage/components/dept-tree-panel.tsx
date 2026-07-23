import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { DeptRecord } from "@/types/auth";
import { DeptNavTreeNode } from "./dept-nav-tree-node";

type DeptTreePanelProps = {
  tree: DeptRecord[];
  selectedId: number | null;
  canUpdate: boolean;
  parentNameById: Map<number, string>;
  onSelect: (dept: DeptRecord) => void;
  onMove: (dragId: number, targetId: number) => void;
};

export function DeptTreePanel({ tree, selectedId, canUpdate, parentNameById, onSelect, onMove }: DeptTreePanelProps) {
  return (
    <div className="surface-glass rounded-lg border p-3">
      <p className="mb-2 text-sm font-medium">部门树</p>
      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无部门</p>
      ) : (
        <ScrollArea className="max-h-[calc(100dvh-14rem)]">
          <div className="space-y-0.5 pr-2">
            {tree.map((node) => (
              <DeptNavTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                dragEnabled={canUpdate}
                parentNameById={parentNameById}
                onSelect={onSelect}
                onMove={onMove}
              />
            ))}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      )}
    </div>
  );
}
