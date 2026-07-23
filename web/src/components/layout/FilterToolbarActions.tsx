import {
  Children,
  type CSSProperties,
  cloneElement,
  forwardRef,
  isValidElement,
  type ReactNode,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterPanelActionsClass, filterToolbarButtonClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

/** 功能按钮区直接展示上限，超出收入「更多」。 */
export const FILTER_TOOLBAR_MAX_VISIBLE_ACTIONS = 3;

interface FilterToolbarActionsProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** 为筛选区按钮注入统一尺寸（与展开/收起一致）。 */
function withToolbarButtonClass(node: ReactNode): ReactNode {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(node)) return node;

  if (node.type === Button) {
    return cloneElement(node, {
      className: cn(filterToolbarButtonClass, node.props.className),
    });
  }

  if (node.props.children != null) {
    const nextChildren = Children.map(node.props.children, withToolbarButtonClass);
    return cloneElement(node, { children: nextChildren });
  }

  return node;
}

/** 筛选区功能按钮：最多展示 3 个，其余折叠到「更多」。 */
export const FilterToolbarActions = forwardRef<HTMLDivElement, FilterToolbarActionsProps>(function FilterToolbarActions(
  { children, className, style },
  ref,
) {
  const [moreOpen, setMoreOpen] = useState(false);
  const items = Children.toArray(children).filter(Boolean).map(withToolbarButtonClass);
  const visible = items.slice(0, FILTER_TOOLBAR_MAX_VISIBLE_ACTIONS);
  const overflow = items.slice(FILTER_TOOLBAR_MAX_VISIBLE_ACTIONS);

  return (
    <div ref={ref} className={cn(filterPanelActionsClass, className)} style={style}>
      {visible}
      {overflow.length > 0 ? (
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger render={<Button type="button" variant="outline" className={filterToolbarButtonClass} />}>
            更多
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="flex w-auto min-w-32 flex-col gap-2 p-2 [&_button]:h-11 [&_button]:w-full [&_button]:px-3"
          >
            {overflow.map((item, index) => (
              <div key={index}>{item}</div>
            ))}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
});
