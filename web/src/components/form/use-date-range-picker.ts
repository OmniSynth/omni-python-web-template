import { isSameDay } from "date-fns";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  buildPresetRange,
  cloneRange,
  type DateRangeValue,
  hasCompleteRange,
  normalizePickerRange,
  type PickPhase,
  rangeToValue,
  resolveCalendarSelected,
  resolveViewMonth,
  valueToRange,
} from "@/components/form/date-range-filter-utils";

interface UseDateRangePickerOptions {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  timezone: string;
}

export function useDateRangePicker({ value, onChange, timezone }: UseDateRangePickerOptions) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [phase, setPhase] = useState<PickPhase>({ type: "idle" });
  const [hoverDate, setHoverDate] = useState<Date | undefined>();
  const [viewMonth, setViewMonth] = useState(() => new Date());

  const committed = useMemo(() => valueToRange(value), [value]);
  const calendarSelected = useMemo(() => resolveCalendarSelected(phase, range, hoverDate), [phase, range, hoverDate]);
  const calendarKey = useMemo(
    () => `${value.from}|${value.to}|${open ? "open" : "closed"}`,
    [value.from, value.to, open],
  );
  const hasValue = Boolean(value.from.trim() || value.to.trim());

  function commitRange(next: DateRange | undefined) {
    const normalized = normalizePickerRange(next);
    if (!normalized?.from || !normalized.to) return;
    onChange(rangeToValue(normalized));
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const restored = cloneRange(valueToRange(value));
      setRange(restored);
      setPhase({ type: "idle" });
      setHoverDate(undefined);
      setViewMonth(resolveViewMonth(restored));
    } else {
      setHoverDate(undefined);
    }
    setOpen(nextOpen);
  }

  function handleSelect(_selected: DateRange | undefined, triggerDate: Date) {
    setHoverDate(undefined);
    if (phase.type === "edit-from") {
      commitRange({ from: triggerDate, to: phase.fixedTo });
      return;
    }
    if (phase.type === "edit-to") {
      commitRange({ from: phase.fixedFrom, to: triggerDate });
      return;
    }
    if (phase.type === "picking") {
      commitRange({ from: phase.anchor, to: triggerDate });
      return;
    }
    if (hasCompleteRange(range)) {
      if (isSameDay(triggerDate, range.from)) {
        setPhase({ type: "edit-from", fixedTo: range.to });
        setRange({ from: range.from, to: undefined });
        return;
      }
      if (isSameDay(triggerDate, range.to)) {
        setPhase({ type: "edit-to", fixedFrom: range.from });
        setRange({ from: range.from, to: undefined });
        return;
      }
      setPhase({ type: "picking", anchor: triggerDate });
      setRange({ from: triggerDate, to: undefined });
      return;
    }
    setPhase({ type: "picking", anchor: triggerDate });
    setRange({ from: triggerDate, to: undefined });
  }

  function applyPreset(days: number) {
    const next = buildPresetRange(days, timezone);
    onChange(rangeToValue(next));
    setRange(cloneRange(next));
    setPhase({ type: "idle" });
    setHoverDate(undefined);
    setViewMonth(resolveViewMonth(next));
    setOpen(false);
  }

  return {
    open,
    committed,
    calendarSelected,
    calendarKey,
    phase,
    viewMonth,
    hasValue,
    handleOpenChange,
    handleSelect,
    applyPreset,
    setViewMonth,
    setHoverDate,
  };
}
