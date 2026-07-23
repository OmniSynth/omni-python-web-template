import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { type DayButtonProps, DayPicker, type DropdownProps, getDefaultClassNames } from "react-day-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** 日历年月导航：Select 替代原生 select。 */
function CalendarDropdown({
  options = [],
  className,
  value,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const stringValue = value == null ? undefined : String(value);

  return (
    <Select
      value={stringValue}
      disabled={disabled}
      options={options.map((option) => ({
        value: String(option.value),
        label: option.label,
      }))}
      onValueChange={(next) => {
        onChange?.({
          target: { value: next },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("h-8 min-h-8 w-auto min-w-18 gap-1 px-2 py-0 text-xs shadow-none", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="start"
        side="bottom"
        sideOffset={2}
        alignItemWithTrigger={false}
        portalContainer={null}
        className="z-120 max-h-56 min-w-(--anchor-width)"
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("group/calendar bg-background p-3 [--cell-size:2rem]", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn("relative inline-flex", defaultClassNames.dropdown_root),
        dropdown: cn("sr-only", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none rounded-md text-[0.8rem] font-normal text-muted-foreground",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-[--cell-size] select-none", defaultClassNames.week_number_header),
        week_number: cn("select-none text-[0.8rem] text-muted-foreground", defaultClassNames.week_number),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          "[&:has([data-range-start=true])]:rounded-l-md [&:has([data-range-start=true])]:bg-accent",
          "[&:has([data-range-middle=true])]:rounded-none [&:has([data-range-middle=true])]:bg-accent",
          "[&:has([data-range-end=true])]:rounded-r-md [&:has([data-range-end=true])]:bg-accent",
          defaultClassNames.day,
        ),
        range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-accent", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn("rounded-md font-semibold", defaultClassNames.today),
        outside: cn("text-muted-foreground aria-selected:text-muted-foreground", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={cn(rootClassName)} {...rootProps} />
        ),
        Chevron: ({ className: chevronClassName, orientation, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("size-4", chevronClassName)} {...chevronProps} />;
        },
        DayButton: CalendarDayButton,
        Dropdown: CalendarDropdown,
        ...components,
      }}
      {...props}
    />
  );
}

type CalendarDayButtonProps = DayButtonProps & {
  /** 悬浮预览态：浅色 range，与最终选中主色区分。 */
  preview?: boolean;
};

function CalendarDayButton({ className, day, modifiers, preview = false, ...props }: CalendarDayButtonProps) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);
  const isRangeSingleDay = modifiers.range_start && modifiers.range_end;
  const inSelection =
    modifiers.range_start ||
    modifiers.range_end ||
    modifiers.range_middle ||
    (modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex size-[--cell-size] flex-col gap-1 p-0 font-normal leading-none",
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground",
        "data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground",
        !preview &&
          isRangeSingleDay &&
          "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        !preview &&
          !isRangeSingleDay &&
          modifiers.range_middle &&
          "rounded-none bg-transparent text-accent-foreground shadow-none hover:bg-transparent hover:text-accent-foreground",
        !preview &&
          !isRangeSingleDay &&
          modifiers.range_start &&
          "rounded-none rounded-l-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        !preview &&
          !isRangeSingleDay &&
          modifiers.range_end &&
          "rounded-none rounded-r-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        preview &&
          isRangeSingleDay &&
          "rounded-md bg-primary/20 text-foreground hover:bg-primary/20 hover:text-foreground",
        preview &&
          !isRangeSingleDay &&
          modifiers.range_middle &&
          "rounded-none bg-transparent text-foreground shadow-none hover:bg-transparent hover:text-foreground",
        preview &&
          !isRangeSingleDay &&
          modifiers.range_start &&
          "rounded-none rounded-l-md bg-primary/20 text-foreground hover:bg-primary/20 hover:text-foreground",
        preview &&
          !isRangeSingleDay &&
          modifiers.range_end &&
          "rounded-none rounded-r-md bg-primary/20 text-foreground hover:bg-primary/20 hover:text-foreground",
        !inSelection && "hover:bg-transparent hover:text-foreground active:bg-transparent",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
