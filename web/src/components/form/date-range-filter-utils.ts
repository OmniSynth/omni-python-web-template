import type { DateRange } from "react-day-picker";
import { buildPresetDateRange, formatDateOnly as formatDateOnlyStorage, parseDateOnly } from "@/lib/datetime";

export interface DateRangeValue {
  from: string;
  to: string;
}

/** 选区交互阶段：空闲 / 二次选点 / 编辑起点 / 编辑终点。 */
export type PickPhase =
  | { type: "idle" }
  | { type: "picking"; anchor: Date }
  | { type: "edit-from"; fixedTo: Date }
  | { type: "edit-to"; fixedFrom: Date };

export function valueToRange(value: DateRangeValue): DateRange | undefined {
  const from = parseDateOnly(value.from);
  const to = parseDateOnly(value.to);
  if (!from && !to) return undefined;
  return normalizePickerRange({ from, to });
}

export function normalizePickerRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) return undefined;
  if (!range.to) return { from: range.from, to: undefined };
  const startMs = range.from.getTime();
  const endMs = range.to.getTime();
  if (startMs <= endMs) return { from: range.from, to: range.to };
  return { from: range.to, to: range.from };
}

export function rangeToValue(range: DateRange | undefined): DateRangeValue {
  return {
    from: range?.from ? formatDateOnlyStorage(range.from) : "",
    to: range?.to ? formatDateOnlyStorage(range.to) : "",
  };
}

export function cloneRange(range: DateRange | undefined): DateRange | undefined {
  if (!range?.from) return undefined;
  return {
    from: new Date(range.from),
    to: range.to ? new Date(range.to) : undefined,
  };
}

export function resolveViewMonth(range: DateRange | undefined): Date {
  return range?.from ?? range?.to ?? new Date();
}

export function hasCompleteRange(range: DateRange | undefined): range is { from: Date; to: Date } {
  return Boolean(range?.from && range.to);
}

export function isAwaitingSecondPick(phase: PickPhase): boolean {
  return phase.type !== "idle";
}

/** 合成日历展示用 range：等待第二次选点时，悬浮日期形成连续范围预览。 */
export function resolveCalendarSelected(
  phase: PickPhase,
  range: DateRange | undefined,
  hoverDate: Date | undefined,
): DateRange | undefined {
  if (phase.type === "picking") {
    if (hoverDate) {
      return normalizePickerRange({ from: phase.anchor, to: hoverDate });
    }
    return { from: phase.anchor, to: undefined };
  }

  if (phase.type === "edit-from") {
    if (hoverDate) {
      return normalizePickerRange({ from: hoverDate, to: phase.fixedTo });
    }
    return range?.from ? { from: range.from, to: undefined } : range;
  }

  if (phase.type === "edit-to") {
    if (hoverDate) {
      return normalizePickerRange({ from: phase.fixedFrom, to: hoverDate });
    }
    return range?.from ? { from: range.from, to: undefined } : range;
  }

  return range;
}

export const RANGE_PRESETS = [
  { label: "今日", days: 1 },
  { label: "近7天", days: 7 },
  { label: "近15天", days: 15 },
  { label: "近30天", days: 30 },
] as const;

export function buildPresetRange(days: number, timeZone: string): DateRange {
  const preset = buildPresetDateRange(days, timeZone);
  const from = parseDateOnly(preset.from);
  const to = parseDateOnly(preset.to);
  if (!from || !to) {
    return { from: new Date(), to: new Date() };
  }
  return { from, to };
}
