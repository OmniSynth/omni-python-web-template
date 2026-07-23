import { addMonths, addYears, format } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { isAwaitingSecondPick, type PickPhase, RANGE_PRESETS } from "@/components/form/date-range-filter-utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const compactNavButtonClass = "size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground";

interface DateRangeFilterCalendarProps {
  calendarKey: string;
  calendarSelected: DateRange | undefined;
  phase: PickPhase;
  viewMonth: Date;
  onApplyPreset: (days: number) => void;
  onViewMonthChange: (month: Date) => void;
  onSelect: (selected: DateRange | undefined, triggerDate: Date) => void;
  onHoverDateChange: (date: Date | undefined) => void;
}

export function DateRangeFilterCalendar({
  calendarKey,
  calendarSelected,
  phase,
  viewMonth,
  onApplyPreset,
  onViewMonthChange,
  onSelect,
  onHoverDateChange,
}: DateRangeFilterCalendarProps) {
  return (
    <div onMouseLeave={() => onHoverDateChange(undefined)}>
      <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
        {RANGE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onApplyPreset(preset.days)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Calendar
        key={calendarKey}
        mode="range"
        locale={zhCN}
        hideNavigation
        min={1}
        resetOnSelect={false}
        className="bg-transparent p-1 [--cell-size:1.5rem]"
        classNames={{
          months: "relative flex flex-col gap-1",
          month: "flex w-full flex-col gap-1",
          month_caption: "h-[--cell-size] w-full px-0.5",
          weekday: "flex-1 select-none text-[0.6875rem] font-normal text-muted-foreground",
          week: "mt-0 flex w-full gap-0",
          day: "flex-1",
        }}
        components={{
          MonthCaption: ({ className, calendarMonth, displayIndex, ...props }) => {
            void calendarMonth;
            void displayIndex;
            return (
              <div className={cn("flex h-[--cell-size] w-full items-center gap-0.5", className)} {...props}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={compactNavButtonClass}
                  aria-label="上一年"
                  onClick={() => onViewMonthChange(addYears(viewMonth, -1))}
                >
                  <ChevronsLeft className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={compactNavButtonClass}
                  aria-label="上一月"
                  onClick={() => onViewMonthChange(addMonths(viewMonth, -1))}
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <span className="flex-1 text-center text-xs font-medium tabular-nums">
                  {format(viewMonth, "yyyy年M月")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={compactNavButtonClass}
                  aria-label="下一月"
                  onClick={() => onViewMonthChange(addMonths(viewMonth, 1))}
                >
                  <ChevronRight className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={compactNavButtonClass}
                  aria-label="下一年"
                  onClick={() => onViewMonthChange(addYears(viewMonth, 1))}
                >
                  <ChevronsRight className="size-3" />
                </Button>
              </div>
            );
          },
        }}
        month={viewMonth}
        onMonthChange={onViewMonthChange}
        defaultMonth={calendarSelected?.from}
        selected={calendarSelected}
        onSelect={onSelect}
        onDayMouseEnter={(date) => {
          if (isAwaitingSecondPick(phase)) {
            onHoverDateChange(date);
          }
        }}
        numberOfMonths={1}
        showOutsideDays={false}
      />
    </div>
  );
}
