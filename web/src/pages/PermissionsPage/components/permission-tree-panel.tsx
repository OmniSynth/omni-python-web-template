import { MenuCatalogTree } from "@/components/menu-catalog-tree";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PermissionInfo } from "@/types/auth";

interface PermissionTreePanelProps {
  tree: PermissionInfo[];
  selectedCode: string | null;
  canUpdate: boolean;
  onSelect: (code: string) => void;
  onMove: (dragCode: string, targetCode: string) => void;
}

export function PermissionTreePanel({ tree, selectedCode, canUpdate, onSelect, onMove }: PermissionTreePanelProps) {
  return (
    <div className="surface-glass flex min-h-0 flex-col overflow-hidden rounded-lg border p-3">
      <p className="mb-2 shrink-0 text-sm font-medium">目录 / 菜单</p>
      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无权限数据</p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="pr-2">
            <MenuCatalogTree
              tree={tree}
              mode="nav"
              selectedCode={selectedCode}
              onSelect={onSelect}
              onMove={onMove}
              dragEnabled={canUpdate}
            />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
