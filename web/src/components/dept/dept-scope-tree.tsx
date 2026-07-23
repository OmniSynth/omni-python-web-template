import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DeptRecord } from "@/types/auth";

/** 自定义数据权限：勾选可见部门树。 */
export function DeptScopeTree({
  nodes,
  selected,
  onToggle,
  depth = 0,
}: {
  nodes: DeptRecord[];
  selected: Set<number>;
  onToggle: (id: number, checked: boolean) => void;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? "ml-4 border-l pl-3" : "space-y-1"}>
      {nodes.map((node) => {
        const inputId = `dept-scope-${node.id}`;
        return (
          <li key={node.id}>
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                id={inputId}
                checked={selected.has(node.id)}
                disabled={!node.enabled}
                onCheckedChange={(checked) => onToggle(node.id, checked === true)}
              />
              <Label htmlFor={inputId} className="cursor-pointer font-normal text-foreground">
                {node.name}
              </Label>
            </div>
            {node.children && node.children.length > 0 ? (
              <DeptScopeTree nodes={node.children} selected={selected} onToggle={onToggle} depth={depth + 1} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
