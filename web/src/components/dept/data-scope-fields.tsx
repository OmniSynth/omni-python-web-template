import { DeptScopeTree } from "@/components/dept/dept-scope-tree";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DATA_SCOPE_LABELS, DEFAULT_DATA_SCOPE } from "@/lib/data-scope";
import type { DeptRecord } from "@/types/auth";

/** 下拉选项（固定顺序，避免 Object.entries 数字键歧义）。 */
const DATA_SCOPE_OPTIONS = [
  { value: 1, label: DATA_SCOPE_LABELS[1] },
  { value: 2, label: DATA_SCOPE_LABELS[2] },
  { value: 3, label: DATA_SCOPE_LABELS[3] },
  { value: 4, label: DATA_SCOPE_LABELS[4] },
] as const;

interface DataScopeFieldsProps {
  dataScope: number;
  selectedDeptIds: Set<number>;
  deptTree: DeptRecord[];
  disabled?: boolean;
  onDataScopeChange: (value: number) => void;
  onToggleDeptScope: (id: number, checked: boolean) => void;
}

/** 数据权限范围选择：范围下拉 + 自定义部门树。 */
export function DataScopeFields({
  dataScope,
  selectedDeptIds,
  deptTree,
  disabled,
  onDataScopeChange,
  onToggleDeptScope,
}: DataScopeFieldsProps) {
  const scope = DATA_SCOPE_LABELS[dataScope] != null ? dataScope : DEFAULT_DATA_SCOPE;
  const selectOptions = DATA_SCOPE_OPTIONS.map((item) => ({
    value: String(item.value),
    label: item.label,
  }));

  return (
    <div className="grid gap-2">
      <Label>数据权限范围</Label>
      <Select
        value={String(scope)}
        disabled={disabled}
        options={selectOptions}
        onValueChange={(value) => onDataScopeChange(Number(value))}
      >
        <SelectTrigger>
          <SelectValue placeholder={DATA_SCOPE_LABELS[DEFAULT_DATA_SCOPE]} />
        </SelectTrigger>
        <SelectContent>
          {DATA_SCOPE_OPTIONS.map((item) => (
            <SelectItem key={item.value} value={String(item.value)}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {scope === 4 ? (
        <>
          <Label className="pt-1">自定义部门范围</Label>
          <ScrollArea className="max-h-40 rounded-md border">
            <div className="p-3">
              {deptTree.length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无部门可选</p>
              ) : (
                <DeptScopeTree nodes={deptTree} selected={selectedDeptIds} onToggle={onToggleDeptScope} />
              )}
            </div>
            <ScrollBar />
          </ScrollArea>
        </>
      ) : null}
    </div>
  );
}
