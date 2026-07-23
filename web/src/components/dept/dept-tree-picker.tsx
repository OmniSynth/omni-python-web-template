import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { fieldControlClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";
import type { DeptRecord } from "@/types/auth";

/** 将部门树扁平化为列表（深度优先）。 */
export function flattenDeptRecords(nodes: DeptRecord[]): DeptRecord[] {
  const result: DeptRecord[] = [];
  function walk(list: DeptRecord[]) {
    for (const node of list) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        walk(node.children);
      }
    }
  }
  walk(nodes);
  return result;
}

export function deptNameMap(flat: DeptRecord[]): Map<number, string> {
  return new Map(flat.map((dept) => [dept.id, dept.name]));
}

export function formatParentLabel(name: string | undefined): string {
  if (!name) return "";
  return `上级·${name}`;
}

function DeptTreePickerNode({
  node,
  depth,
  value,
  excludeIds,
  parentNameById,
  onlyEnabled,
  onSelect,
}: {
  node: DeptRecord;
  depth: number;
  value: string;
  excludeIds: Set<number>;
  parentNameById: Map<number, string>;
  onlyEnabled: boolean;
  onSelect: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isSelected = String(node.id) === value;
  const selectable = !onlyEnabled || node.enabled;

  if (excludeIds.has(node.id)) return null;

  return (
    <div>
      <div
        role="button"
        tabIndex={selectable ? 0 : -1}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40",
          depth > 0 && "ml-4",
          isSelected && "bg-muted",
          !node.enabled && "opacity-60",
          !selectable && "cursor-not-allowed hover:bg-transparent",
        )}
        onClick={() => {
          if (!selectable) return;
          onSelect(String(node.id));
        }}
        onKeyDown={(event) => {
          if (!selectable) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(String(node.id));
          }
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "收起" : "展开"}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((current) => !current);
            }}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{node.name}</span>
        {node.parent_id !== 0 ? (
          <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
            {formatParentLabel(parentNameById.get(node.parent_id))}
          </span>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <div>
          {node.children!.map((child) => (
            <DeptTreePickerNode
              key={child.id}
              node={child}
              depth={depth + 1}
              value={value}
              excludeIds={excludeIds}
              parentNameById={parentNameById}
              onlyEnabled={onlyEnabled}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface DeptTreePickerProps {
  id?: string;
  tree: DeptRecord[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeIds?: Set<number>;
  /** 额外根级选项（如部门管理中的「无（顶级）」） */
  rootOption?: { value: string; label: string };
  /** 仅允许选择已启用部门（用户绑定场景） */
  onlyEnabled?: boolean;
  invalid?: boolean;
}

/** 树形部门选择器，与部门管理左侧树结构一致。 */
export function DeptTreePicker({
  id,
  tree,
  value,
  onChange,
  disabled,
  placeholder = "请选择部门",
  excludeIds = new Set<number>(),
  rootOption,
  onlyEnabled = false,
  invalid,
}: DeptTreePickerProps) {
  const [open, setOpen] = useState(false);
  const flatDepts = useMemo(() => flattenDeptRecords(tree), [tree]);
  const parentNameById = useMemo(() => deptNameMap(flatDepts), [flatDepts]);

  const selectedLabel = useMemo(() => {
    if (rootOption && value === rootOption.value) return rootOption.label;
    return flatDepts.find((dept) => String(dept.id) === value)?.name ?? placeholder;
  }, [flatDepts, placeholder, rootOption, value]);

  function select(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid}
            className={cn(fieldControlClass, "justify-between font-normal")}
          />
        }
      >
        <span className={cn("truncate", !value && "text-muted-foreground/60")}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-2" align="start">
        <ScrollArea className="max-h-64">
          <div className="space-y-0.5 pr-2">
            {rootOption ? (
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40",
                  value === rootOption.value && "bg-muted",
                )}
                onClick={() => select(rootOption.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(rootOption.value);
                  }
                }}
              >
                <span className="w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left">{rootOption.label}</span>
              </div>
            ) : null}
            {tree.map((node) => (
              <DeptTreePickerNode
                key={node.id}
                node={node}
                depth={0}
                value={value}
                excludeIds={excludeIds}
                parentNameById={parentNameById}
                onlyEnabled={onlyEnabled}
                onSelect={select}
              />
            ))}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
