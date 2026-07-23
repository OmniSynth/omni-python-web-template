import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import {
  DATETIME_FORMAT_OPTIONS,
  type DateTimeFormatId,
  formatDateTime as fmtDateTime,
  formatDateOnlyDisplay,
  getBrowserTimezone,
  listTimezoneOptions,
  loadStoredDateTimeFormat,
  loadStoredTimezone,
  saveDateTimeFormat,
  saveTimezone,
} from "@/lib/datetime";

interface TimezoneContextValue {
  timezone: string;
  browserTimezone: string;
  timezoneOptions: { value: string; label: string }[];
  dateTimeFormat: DateTimeFormatId;
  dateTimeFormatOptions: typeof DATETIME_FORMAT_OPTIONS;
  setTimezone: (tz: string) => void;
  setDateTimeFormat: (formatId: DateTimeFormatId) => void;
  formatDateTime: (value: string | Date | null | undefined) => string;
  formatDateOnly: (dateValue: string) => string;
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const timezoneOptions = useMemo(() => listTimezoneOptions(), []);
  const [timezone, setTimezoneState] = useState(() => loadStoredTimezone());
  const [dateTimeFormat, setDateTimeFormatState] = useState(() => loadStoredDateTimeFormat());

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
    saveTimezone(tz);
  }, []);

  const setDateTimeFormat = useCallback((formatId: DateTimeFormatId) => {
    setDateTimeFormatState(formatId);
    saveDateTimeFormat(formatId);
  }, []);

  const formatDateTime = useCallback(
    (value: string | Date | null | undefined) => fmtDateTime(value, timezone, dateTimeFormat),
    [timezone, dateTimeFormat],
  );

  const formatDateOnly = useCallback(
    (dateValue: string) => formatDateOnlyDisplay(dateValue, timezone, dateTimeFormat),
    [timezone, dateTimeFormat],
  );

  const value = useMemo(
    () => ({
      timezone,
      browserTimezone,
      timezoneOptions,
      dateTimeFormat,
      dateTimeFormatOptions: DATETIME_FORMAT_OPTIONS,
      setTimezone,
      setDateTimeFormat,
      formatDateTime,
      formatDateOnly,
    }),
    [
      timezone,
      browserTimezone,
      timezoneOptions,
      dateTimeFormat,
      setTimezone,
      setDateTimeFormat,
      formatDateTime,
      formatDateOnly,
    ],
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error("useTimezone 须在 TimezoneProvider 内使用");
  return ctx;
}
