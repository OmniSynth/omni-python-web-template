/** 图形化 cron 配置与标准 5 段表达式互转。 */

export type CronMode = "every_n_minutes" | "hourly" | "daily" | "weekly" | "custom";

export type CronFieldMode = "any" | "step" | "specific" | "range";

export type CronFieldKey = "minute" | "hour" | "day" | "month" | "weekday";

export type CronFieldConfig = {
  mode: CronFieldMode;
  step: number;
  specific: number[];
  rangeStart: number;
  rangeEnd: number;
};

export type CronCustomFields = Record<CronFieldKey, CronFieldConfig>;

export type CronConfig = {
  mode: CronMode;
  everyNMinutes: number;
  hourlyMinute: number;
  dailyHour: number;
  dailyMinute: number;
  weeklyHour: number;
  weeklyMinute: number;
  weeklyDay: number;
  customFields: CronCustomFields;
};

export type CronFieldMeta = {
  key: CronFieldKey;
  label: string;
  min: number;
  max: number;
  stepOptions: number[];
  valueLabel: (value: number) => string;
};

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export const CRON_FIELD_MODE_OPTIONS: Array<{ value: CronFieldMode; label: string }> = [
  { value: "any", label: "不限" },
  { value: "step", label: "每隔" },
  { value: "specific", label: "指定" },
  { value: "range", label: "区间" },
];

export const CRON_FIELD_META: CronFieldMeta[] = [
  {
    key: "minute",
    label: "分钟",
    min: 0,
    max: 59,
    stepOptions: [1, 2, 3, 5, 10, 15, 20, 30],
    valueLabel: (value) => String(value).padStart(2, "0"),
  },
  {
    key: "hour",
    label: "小时",
    min: 0,
    max: 23,
    stepOptions: [1, 2, 3, 4, 6, 12],
    valueLabel: (value) => `${String(value).padStart(2, "0")} 时`,
  },
  {
    key: "day",
    label: "日",
    min: 1,
    max: 31,
    stepOptions: [1, 2, 3, 5, 7, 15],
    valueLabel: (value) => `${value} 日`,
  },
  {
    key: "month",
    label: "月",
    min: 1,
    max: 12,
    stepOptions: [1, 2, 3, 4, 6],
    valueLabel: (value) => `${value} 月`,
  },
  {
    key: "weekday",
    label: "星期",
    min: 0,
    max: 6,
    stepOptions: [],
    valueLabel: (value) => WEEKDAY_LABELS[value] ?? String(value),
  },
];

export const CRON_MODE_OPTIONS: Array<{ value: CronMode; label: string }> = [
  { value: "every_n_minutes", label: "每隔 N 分钟" },
  { value: "hourly", label: "每小时" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "custom", label: "自定义" },
];

export function defaultCronFieldConfig(min = 0): CronFieldConfig {
  return {
    mode: "any",
    step: 1,
    specific: [],
    rangeStart: min,
    rangeEnd: min,
  };
}

export function defaultCronCustomFields(): CronCustomFields {
  return {
    minute: defaultCronFieldConfig(0),
    hour: defaultCronFieldConfig(0),
    day: defaultCronFieldConfig(1),
    month: defaultCronFieldConfig(1),
    weekday: defaultCronFieldConfig(0),
  };
}

export function defaultCronConfig(): CronConfig {
  return {
    mode: "every_n_minutes",
    everyNMinutes: 5,
    hourlyMinute: 0,
    dailyHour: 9,
    dailyMinute: 0,
    weeklyHour: 9,
    weeklyMinute: 0,
    weeklyDay: 1,
    customFields: defaultCronCustomFields(),
  };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function buildFieldExpr(field: CronFieldConfig, min: number, max: number): string {
  switch (field.mode) {
    case "any":
      return "*";
    case "step":
      return `*/${clampInt(field.step, 1, max - min + 1)}`;
    case "range": {
      const start = clampInt(field.rangeStart, min, max);
      const end = clampInt(field.rangeEnd, min, max);
      return start <= end ? `${start}-${end}` : `${end}-${start}`;
    }
    case "specific": {
      if (field.specific.length === 0) return "*";
      return [...field.specific]
        .map((value) => clampInt(value, min, max))
        .sort((a, b) => a - b)
        .join(",");
    }
  }
}

export function parseFieldExpr(expr: string, min: number, max: number): CronFieldConfig {
  const base = defaultCronFieldConfig(min);
  const trimmed = expr.trim();
  if (!trimmed || trimmed === "*") {
    return base;
  }
  const stepMatch = trimmed.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    return { ...base, mode: "step", step: clampInt(Number(stepMatch[1]), 1, max - min + 1) };
  }
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return {
      ...base,
      mode: "range",
      rangeStart: clampInt(Number(rangeMatch[1]), min, max),
      rangeEnd: clampInt(Number(rangeMatch[2]), min, max),
    };
  }
  if (/^[\d,]+$/.test(trimmed)) {
    const specific = trimmed
      .split(",")
      .map((part) => Number(part))
      .filter((value) => Number.isInteger(value) && value >= min && value <= max);
    if (specific.length > 0) {
      return { ...base, mode: "specific", specific };
    }
  }
  if (/^\d+$/.test(trimmed)) {
    const value = clampInt(Number(trimmed), min, max);
    return { ...base, mode: "specific", specific: [value] };
  }
  return base;
}

function parseCustomFields(parts: string[]): CronCustomFields {
  const [minute, hour, day, month, weekday] = parts;
  return {
    minute: parseFieldExpr(minute ?? "*", 0, 59),
    hour: parseFieldExpr(hour ?? "*", 0, 23),
    day: parseFieldExpr(day ?? "*", 1, 31),
    month: parseFieldExpr(month ?? "*", 1, 12),
    weekday: parseFieldExpr(weekday ?? "*", 0, 6),
  };
}

export function buildCronExpr(config: CronConfig): string {
  switch (config.mode) {
    case "every_n_minutes":
      return `*/${clampInt(config.everyNMinutes, 1, 59)} * * * *`;
    case "hourly":
      return `${clampInt(config.hourlyMinute, 0, 59)} * * * *`;
    case "daily":
      return `${clampInt(config.dailyMinute, 0, 59)} ${clampInt(config.dailyHour, 0, 23)} * * *`;
    case "weekly":
      return `${clampInt(config.weeklyMinute, 0, 59)} ${clampInt(config.weeklyHour, 0, 23)} * * ${clampInt(config.weeklyDay, 0, 6)}`;
    case "custom":
      return CRON_FIELD_META.map((meta) => buildFieldExpr(config.customFields[meta.key], meta.min, meta.max)).join(" ");
  }
}

export function parseCronExpr(expr: string, options?: { preferCustom?: boolean }): CronConfig {
  const base = defaultCronConfig();
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      ...base,
      mode: "custom",
      customFields: defaultCronCustomFields(),
    };
  }
  if (options?.preferCustom) {
    return {
      ...base,
      mode: "custom",
      customFields: parseCustomFields(parts),
    };
  }
  const [minute, hour, day, month, weekday] = parts;
  if (minute.startsWith("*/") && hour === "*" && day === "*" && month === "*" && weekday === "*") {
    const n = Number(minute.slice(2));
    if (Number.isInteger(n) && n >= 1 && n <= 59) {
      return { ...base, mode: "every_n_minutes", everyNMinutes: n };
    }
  }
  if (/^\d+$/.test(minute) && hour === "*" && day === "*" && month === "*" && weekday === "*") {
    return { ...base, mode: "hourly", hourlyMinute: Number(minute) };
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && day === "*" && month === "*" && weekday === "*") {
    return { ...base, mode: "daily", dailyMinute: Number(minute), dailyHour: Number(hour) };
  }
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && day === "*" && month === "*" && /^\d+$/.test(weekday)) {
    return {
      ...base,
      mode: "weekly",
      weeklyMinute: Number(minute),
      weeklyHour: Number(hour),
      weeklyDay: Number(weekday),
    };
  }
  return {
    ...base,
    mode: "custom",
    customFields: parseCustomFields(parts),
  };
}

function describeField(field: CronFieldConfig, meta: CronFieldMeta): string | null {
  switch (field.mode) {
    case "any":
      return null;
    case "step":
      return `每 ${field.step} ${meta.label}`;
    case "range":
      return `${meta.valueLabel(field.rangeStart)} 至 ${meta.valueLabel(field.rangeEnd)}`;
    case "specific":
      return field.specific.map((value) => meta.valueLabel(value)).join("、");
  }
}

export function describeCronExpr(expr: string, options?: { preferCustom?: boolean }): string {
  const config = parseCronExpr(expr, options);
  switch (config.mode) {
    case "every_n_minutes":
      return `每 ${config.everyNMinutes} 分钟执行一次`;
    case "hourly":
      return `每小时第 ${config.hourlyMinute} 分钟执行`;
    case "daily":
      return `每天 ${String(config.dailyHour).padStart(2, "0")}:${String(config.dailyMinute).padStart(2, "0")} 执行`;
    case "weekly":
      return `每周${WEEKDAY_LABELS[config.weeklyDay] ?? config.weeklyDay} ${String(config.weeklyHour).padStart(2, "0")}:${String(config.weeklyMinute).padStart(2, "0")} 执行`;
    case "custom": {
      const parts = CRON_FIELD_META.map((meta) => describeField(config.customFields[meta.key], meta)).filter(
        (part): part is string => Boolean(part),
      );
      return parts.length > 0 ? parts.join("；") : "每分钟均可执行";
    }
  }
}

export function weekdayOptions() {
  return WEEKDAY_LABELS.map((label, value) => ({ value: String(value), label }));
}

export function hourOptions() {
  return Array.from({ length: 24 }, (_, value) => ({
    value: String(value),
    label: `${String(value).padStart(2, "0")}:00`,
  }));
}

export function minuteOptions(step = 1) {
  return Array.from({ length: Math.ceil(60 / step) }, (_, index) => {
    const value = index * step;
    return { value: String(value), label: String(value).padStart(2, "0") };
  });
}

export function everyMinuteOptions() {
  return [1, 2, 3, 5, 10, 15, 20, 30].map((value) => ({
    value: String(value),
    label: `每 ${value} 分钟`,
  }));
}

export function fieldValueOptions(meta: CronFieldMeta) {
  return Array.from({ length: meta.max - meta.min + 1 }, (_, index) => {
    const value = meta.min + index;
    return { value: String(value), label: meta.valueLabel(value) };
  });
}

export function fieldStepOptions(meta: CronFieldMeta) {
  return meta.stepOptions.map((value) => ({
    value: String(value),
    label: `每 ${value} ${meta.label}`,
  }));
}
