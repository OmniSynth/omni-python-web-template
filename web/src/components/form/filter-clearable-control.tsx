import { X } from "lucide-react";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterClearableVariant = "input" | "select";

interface FilterClearableControlProps {
  children: ReactNode;
  onClear?: () => void;
  clearVisible?: boolean;
  clearLabel?: string;
  /** select：清空时隐藏内置下拉箭头，避免与右侧清空图标重叠 */
  variant?: FilterClearableVariant;
  className?: string;
}

const CLEAR_BUTTON_CLASS = "right-1.5";
const CLEAR_PADDING_CLASS = "pr-9";

/** 筛选控件内嵌清空按钮（居右，不占用标签行）。 */
export function FilterClearableControl({
  children,
  onClear,
  clearVisible = false,
  clearLabel = "清空",
  variant = "input",
  className,
}: FilterClearableControlProps) {
  const showClear = Boolean(onClear) && clearVisible;
  const child = Children.only(children);

  const control =
    showClear && isValidElement<{ className?: string }>(child)
      ? cloneElement(child, {
          className: cn(
            child.props.className,
            CLEAR_PADDING_CLASS,
            variant === "select" && "[&>span:last-child]:hidden",
          ),
        })
      : child;

  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      {control}
      {showClear ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-1/2 z-10 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground",
            CLEAR_BUTTON_CLASS,
          )}
          aria-label={clearLabel}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClear?.();
          }}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
