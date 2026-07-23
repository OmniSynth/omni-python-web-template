const STORAGE_KEY = "omni-timezone";
const FORMAT_STORAGE_KEY = "omni-datetime-format";

/** 时间显示格式预设。 */
export type DateTimeFormatId = "iso-sec" | "iso-min" | "slash-min" | "cn-sec" | "us-sec" | "us-24";

export interface DateTimeFormatOption {
  id: DateTimeFormatId;
  label: string;
  sample: string;
}

export const DATETIME_FORMAT_OPTIONS: DateTimeFormatOption[] = [
  { id: "iso-sec", label: "ISO 含秒", sample: "2026-06-29 14:30:55" },
  { id: "iso-min", label: "ISO 至分", sample: "2026-06-29 14:30" },
  { id: "slash-min", label: "斜杠至分", sample: "2026/06/29 14:30" },
  { id: "cn-sec", label: "中文含秒", sample: "2026年06月29日 14:30:55" },
  { id: "us-sec", label: "美式 12h", sample: "06/29/2026 02:30:55 PM" },
  { id: "us-24", label: "美式 24h", sample: "06/29/2026 14:30:55" },
];

const DEFAULT_FORMAT_ID: DateTimeFormatId = "iso-sec";

function isValidFormatId(id: string): id is DateTimeFormatId {
  return DATETIME_FORMAT_OPTIONS.some((o) => o.id === id);
}

export function loadStoredDateTimeFormat(): DateTimeFormatId {
  try {
    const stored = localStorage.getItem(FORMAT_STORAGE_KEY);
    if (stored && isValidFormatId(stored)) return stored;
  } catch {
    /* 忽略 */
  }
  return DEFAULT_FORMAT_ID;
}

export function saveDateTimeFormat(id: DateTimeFormatId): void {
  try {
    localStorage.setItem(FORMAT_STORAGE_KEY, id);
  } catch {
    /* 忽略 */
  }
}

/** 获取浏览器默认 IANA 时区。 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** 从 localStorage 读取时区，无效时回退浏览器时区。 */
export function loadStoredTimezone(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidTimezone(stored)) return stored;
  } catch {
    /* 隐私模式等场景忽略 */
  }
  return getBrowserTimezone();
}

export function saveTimezone(tz: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, tz);
  } catch {
    /* 忽略 */
  }
}

/** 解析 API 时间字符串；无时区信息时按 UTC 处理。 */
export function parseApiDateTime(value: string): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const hasZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(normalized);
  const iso = hasZone ? normalized : `${normalized}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DEFAULT_FMT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

function partsInTimezone(date: Date, timeZone: string, hour12: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12,
  }).formatToParts(date);
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

interface WallTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** 将指定时区的墙上时间转为 UTC 时刻。 */
function zonedWallTimeToUtc(wall: WallTimeParts, timeZone: string): Date | null {
  let utcMs = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  const targetMs = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);

  for (let i = 0; i < 4; i += 1) {
    const parts = partsInTimezone(new Date(utcMs), timeZone, false);
    const actualMs = Date.UTC(
      Number(partValue(parts, "year")),
      Number(partValue(parts, "month")) - 1,
      Number(partValue(parts, "day")),
      Number(partValue(parts, "hour")),
      Number(partValue(parts, "minute")),
      Number(partValue(parts, "second")),
    );
    const diff = targetMs - actualMs;
    if (diff === 0) return new Date(utcMs);
    utcMs += diff;
  }
  return new Date(utcMs);
}

/** 解析 `yyyy-MM-dd` 为本地 Date（仅日期部分，不含时区偏移）。 */
export function parseDateOnly(value: string): Date | undefined {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** 将 `yyyy-MM-dd` 墙上日期按格式预设展示（不含时分秒，供日期筛选输入框）。 */
export function formatDateOnlyDisplay(
  dateValue: string,
  _timeZone: string,
  formatId: DateTimeFormatId = DEFAULT_FORMAT_ID,
): string {
  const match = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateValue.trim() || "—";
  const y = match[1];
  const mo = match[2];
  const d = match[3];

  switch (formatId) {
    case "slash-min":
      return `${y}/${mo}/${d}`;
    case "cn-sec":
      return `${y}年${mo}月${d}日`;
    case "us-sec":
    case "us-24":
      return `${mo}/${d}/${y}`;
    case "iso-min":
    case "iso-sec":
    default:
      return `${y}-${mo}-${d}`;
  }
}

/** 将 Date 格式化为 `yyyy-MM-dd`（内部存储）。 */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 将日期（用户所选时区）转为 API UTC naive ISO；start=当日 00:00:00，end=当日 23:59:59。 */
export function dateOnlyToApiUtc(dateValue: string, timeZone: string, bound: "start" | "end"): string | undefined {
  const trimmed = dateValue.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const utcDate = zonedWallTimeToUtc(
    {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: bound === "start" ? 0 : 23,
      minute: bound === "start" ? 0 : 59,
      second: bound === "start" ? 0 : 59,
    },
    timeZone,
  );
  if (!utcDate) return undefined;

  const y = utcDate.getUTCFullYear();
  const mo = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcDate.getUTCDate()).padStart(2, "0");
  const h = String(utcDate.getUTCHours()).padStart(2, "0");
  const mi = String(utcDate.getUTCMinutes()).padStart(2, "0");
  const s = String(utcDate.getUTCSeconds()).padStart(2, "0");
  const micro = bound === "end" ? "999999" : "000000";
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${micro}Z`;
}

export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

/** 获取指定 IANA 时区下的「今天」日历日期。 */
export function todayInTimezone(timeZone: string): CalendarDateParts {
  const parts = partsInTimezone(new Date(), timeZone, false);
  return {
    year: Number(partValue(parts, "year")),
    month: Number(partValue(parts, "month")),
    day: Number(partValue(parts, "day")),
  };
}

function formatCalendarDateParts(parts: CalendarDateParts): string {
  const y = String(parts.year);
  const m = String(parts.month).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 在指定时区的日历上增减天数。 */
export function addCalendarDaysInTimezone(
  parts: CalendarDateParts,
  deltaDays: number,
  timeZone: string,
): CalendarDateParts {
  const anchor = zonedWallTimeToUtc(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 12,
      minute: 0,
      second: 0,
    },
    timeZone,
  );
  if (!anchor) return parts;
  anchor.setUTCDate(anchor.getUTCDate() + deltaDays);
  const next = partsInTimezone(anchor, timeZone, false);
  return {
    year: Number(partValue(next, "year")),
    month: Number(partValue(next, "month")),
    day: Number(partValue(next, "day")),
  };
}

/** 构建近 N 天（含今天）的日期范围字符串（用户时区墙上日期）。 */
export function buildPresetDateRange(days: number, timeZone: string): { from: string; to: string } {
  const today = todayInTimezone(timeZone);
  const fromParts = addCalendarDaysInTimezone(today, -(days - 1), timeZone);
  return {
    from: formatCalendarDateParts(fromParts),
    to: formatCalendarDateParts(today),
  };
}

function formatWithPreset(date: Date, timeZone: string, formatId: DateTimeFormatId): string {
  const hour12 = formatId === "us-sec";
  const parts = partsInTimezone(date, timeZone, hour12);
  const y = partValue(parts, "year");
  const mo = partValue(parts, "month");
  const d = partValue(parts, "day");
  const h = partValue(parts, "hour");
  const mi = partValue(parts, "minute");
  const s = partValue(parts, "second");
  const dayPeriod = partValue(parts, "dayPeriod");

  switch (formatId) {
    case "iso-min":
      return `${y}-${mo}-${d} ${h}:${mi}`;
    case "slash-min":
      return `${y}/${mo}/${d} ${h}:${mi}`;
    case "cn-sec":
      return `${y}年${mo}月${d}日 ${h}:${mi}:${s}`;
    case "us-sec":
      return `${mo}/${d}/${y} ${h}:${mi}:${s}${dayPeriod ? ` ${dayPeriod}` : ""}`;
    case "us-24":
      return `${mo}/${d}/${y} ${h}:${mi}:${s}`;
    case "iso-sec":
    default:
      return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
  }
}

/** 按指定时区与格式预设格式化时间。 */
export function formatDateTime(
  value: string | Date | null | undefined,
  timeZone: string,
  formatId: DateTimeFormatId = DEFAULT_FORMAT_ID,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (value == null || value === "") return "—";
  const date = value instanceof Date ? value : parseApiDateTime(value);
  if (!date) return typeof value === "string" ? value : "—";
  if (Object.keys(options).length === 0) {
    try {
      return formatWithPreset(date, timeZone, formatId);
    } catch {
      return typeof value === "string" ? value : "—";
    }
  }
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      ...DEFAULT_FMT,
      timeZone,
      ...options,
    }).format(date);
  } catch {
    return typeof value === "string" ? value : "—";
  }
}

function timezoneOffsetLabel(tz: string, at = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(at);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

let cachedOptions: { value: string; label: string }[] | null = null;

/** 时区下拉选项（含 UTC 偏移，按偏移与名称排序）。 */
export function listTimezoneOptions(): { value: string; label: string }[] {
  if (cachedOptions) return cachedOptions;

  const zones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [
          "UTC",
          "Asia/Shanghai",
          "Asia/Hong_Kong",
          "Asia/Tokyo",
          "Europe/London",
          "America/New_York",
          "America/Los_Angeles",
        ];

  const now = new Date();
  cachedOptions = [...new Set(zones)]
    .filter(isValidTimezone)
    .map((tz) => {
      const offset = timezoneOffsetLabel(tz, now);
      const name = tz.replace(/_/g, " ");
      return {
        value: tz,
        label: offset ? `${offset} ${name}` : name,
        sortKey: offset,
      };
    })
    .sort((a, b) => {
      const off = a.sortKey.localeCompare(b.sortKey);
      return off !== 0 ? off : a.label.localeCompare(b.label, "zh-CN");
    })
    .map(({ value, label }) => ({ value, label }));

  return cachedOptions;
}

export interface TimezoneOption {
  value: string;
  label: string;
}

/** 时区选项模糊匹配（支持偏移如 +8、名称如 Shanghai）。 */
export function matchTimezoneOption(option: TimezoneOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [option.label, option.value, option.value.replace(/_/g, " "), option.value.replace(/_/g, "/")]
    .join(" ")
    .toLowerCase();
  const compactHaystack = haystack.replace(/\s+/g, "");
  const compactQuery = q.replace(/\s+/g, "");
  return haystack.includes(q) || compactHaystack.includes(compactQuery);
}

/** cmdk 过滤函数：匹配时区 value。 */
export function timezoneCommandFilter(options: TimezoneOption[], value: string, search: string): number {
  const option = options.find((opt) => opt.value === value);
  if (!option) return 0;
  return matchTimezoneOption(option, search) ? 1 : 0;
}
