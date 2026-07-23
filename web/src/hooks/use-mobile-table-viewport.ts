import { useSyncExternalStore } from "react";

/** 与 Tailwind `lg` 一致：手机端表格视口为 < 1024px。 */
export const MOBILE_TABLE_MAX_WIDTH_PX = 1023;

const MOBILE_TABLE_MEDIA_QUERY = `(max-width: ${MOBILE_TABLE_MAX_WIDTH_PX}px)`;

function subscribeMobileTableViewport(onStoreChange: () => void) {
  const media = window.matchMedia(MOBILE_TABLE_MEDIA_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getMobileTableViewportSnapshot() {
  return window.matchMedia(MOBILE_TABLE_MEDIA_QUERY).matches;
}

/** 当前是否为手机端表格视口（与 ConfigurableTable 的 lg 断点一致）。 */
export function useMobileTableViewport(): boolean {
  return useSyncExternalStore(subscribeMobileTableViewport, getMobileTableViewportSnapshot, () => false);
}
