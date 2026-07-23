import { X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { DateRangeFilterCalendar } from "@/components/form/date-range-filter-calendar";
import type { DateRangeValue } from "@/components/form/date-range-filter-utils";
import { FilterField } from "@/components/form/filter-field";
import { useDateRangePicker } from "@/components/form/use-date-range-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTimezone } from "@/contexts/TimezoneContext";
import { fieldControlClass } from "@/lib/field-control";
import { cn } from "@/lib/utils";

export type { DateRangeValue };

interface DateRangeFilterFieldProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: ReactNode;
  className?: string;
}

/** 筛选区日期范围：shadcn range 选区 + 端点编辑与重选。 */
export function DateRangeFilterField({ value, onChange, label = "时间", className }: DateRangeFilterFieldProps) {
  const { timezone, formatDateOnly } = useTimezone();
  const picker = useDateRangePicker({ value, onChange, timezone });

  function handleClear(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    onChange({ from: "", to: "" });
  }

  return (
    <FilterField label={label} className={className}>
      <Popover open={picker.open} onOpenChange={picker.handleOpenChange}>
        <PopoverTrigger
          nativeButton={false}
          render={
            <button
              type="button"
              className={cn(
                fieldControlClass,
                "font-normal",
                picker.hasValue ? "justify-between gap-2" : "justify-start",
              )}
            />
          }
        >
          {picker.committed?.from && picker.committed.to ? (
            <span className="min-w-0 truncate text-left">
              {formatDateOnly(value.from)} - {formatDateOnly(value.to)}
            </span>
          ) : (
            <span className="text-muted-foreground">开始时间 ～ 结束时间</span>
          )}
          {picker.hasValue ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="清空时间"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              onClick={handleClear}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange({ from: "", to: "" });
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {picker.open ? (
            <DateRangeFilterCalendar
              calendarKey={picker.calendarKey}
              calendarSelected={picker.calendarSelected}
              phase={picker.phase}
              viewMonth={picker.viewMonth}
              onApplyPreset={picker.applyPreset}
              onViewMonthChange={picker.setViewMonth}
              onSelect={picker.handleSelect}
              onHoverDateChange={picker.setHoverDate}
            />
          ) : null}
        </PopoverContent>
      </Popover>
    </FilterField>
  );
}
