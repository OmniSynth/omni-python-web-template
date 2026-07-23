import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type * as React from "react";
import { useSheetPortalContainer } from "@/components/ui/sheet";
import { fieldControlClass } from "@/lib/field-control";
import { notifySelectClosed } from "@/lib/portaled-overlay";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: React.ReactNode;
};

/** 将 options 转为 Base UI Select 所需的 value → label 映射（触发器回显用）。 */
export function selectItemsFromOptions(options: ReadonlyArray<SelectOption>): Record<string, React.ReactNode> {
  return Object.fromEntries(options.map((option) => [option.value, option.label]));
}

function Select({
  onOpenChange,
  onValueChange,
  items,
  options,
  ...props
}: Omit<SelectPrimitive.Root.Props<string, false>, "onValueChange"> & {
  onValueChange?: (value: string) => void;
  /** value/label 列表；用于 SelectValue 回显 label 而非原始 value */
  options?: ReadonlyArray<SelectOption>;
}) {
  const resolvedItems = items ?? (options ? selectItemsFromOptions(options) : undefined);

  return (
    <SelectPrimitive.Root
      {...props}
      items={resolvedItems}
      onOpenChange={(open, eventDetails) => {
        if (!open) notifySelectClosed();
        onOpenChange?.(open, eventDetails);
      }}
      onValueChange={(value) => {
        if (value != null) onValueChange?.(value);
      }}
    />
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1 p-1", className)} {...props} />;
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left data-placeholder:text-muted-foreground/60", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(fieldControlClass, "items-center justify-between [&>span]:line-clamp-1", className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={<ChevronDown className="pointer-events-none size-4 opacity-50" />} />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  portalContainer: portalContainerProp,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"> & {
    /** 将下拉挂载到指定容器（如抽屉 body），避免被 Dialog 判定为外部点击 */
    portalContainer?: HTMLElement | null;
  }) {
  const sheetPortal = useSheetPortalContainer();
  const portalContainer = portalContainerProp === undefined ? sheetPortal : portalContainerProp;

  return (
    <SelectPrimitive.Portal container={portalContainer ?? undefined}>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-100"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "surface-glass-strong relative isolate z-100 max-h-96 min-w-32 overflow-hidden rounded-xl border border-border text-card-foreground",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="p-1">{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({ className, children, label, ...props }: SelectPrimitive.Item.Props) {
  const resolvedLabel =
    label ?? (typeof children === "string" || typeof children === "number" ? String(children) : undefined);

  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      label={resolvedLabel}
      className={cn(
        "relative flex w-full min-h-10 cursor-default select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center" />}
      >
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover/90 py-1 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      <ChevronUp className="size-4" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover/90 py-1 backdrop-blur-sm",
        className,
      )}
      {...props}
    >
      <ChevronDown className="size-4" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
