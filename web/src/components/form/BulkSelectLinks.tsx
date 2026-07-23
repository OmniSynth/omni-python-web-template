import { cn } from "@/lib/utils";

interface BulkSelectLinksProps {
  /** 是否已全选；决定按钮文案与下一次点击行为。 */
  allSelected: boolean;
  onToggle: () => void;
  selectLabel?: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
}

/** 全选 / 取消合一：未全选时全选，已全选时清空。 */
export function BulkSelectLinks({
  allSelected,
  onToggle,
  selectLabel = "全选",
  clearLabel = "取消",
  disabled = false,
  className,
}: BulkSelectLinksProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "shrink-0 text-xs hover:underline disabled:cursor-not-allowed disabled:opacity-50",
        allSelected ? "text-muted-foreground" : "text-primary",
        className,
      )}
      onClick={onToggle}
    >
      {allSelected ? clearLabel : selectLabel}
    </button>
  );
}
