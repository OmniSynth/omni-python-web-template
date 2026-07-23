import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_CLOSE_DELAY_MS = 120;

/** 鼠标移入立即打开、移出延迟关闭（便于移入相邻浮层）。 */
export function useHoverDelayOpen(closeDelayMs = DEFAULT_CLOSE_DELAY_MS) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), closeDelayMs);
  }, [clearCloseTimer, closeDelayMs]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  return { open, openNow, scheduleClose };
}
