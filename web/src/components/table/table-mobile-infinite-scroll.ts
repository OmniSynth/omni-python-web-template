/** 手机端表格下滑加载下一页。 */
export type TableMobileInfiniteScrollProps = {
  hasMore: boolean;
  onLoadMore: () => void;
  loading?: boolean;
  /** 已加载条数（用于 scroll 节流复位） */
  loadedCount: number;
};

export const MOBILE_INFINITE_SCROLL_THRESHOLD_PX = 120;

export function shouldTriggerMobileLoadMore(
  element: HTMLElement,
  threshold = MOBILE_INFINITE_SCROLL_THRESHOLD_PX,
): boolean {
  // display:none 等隐藏容器 clientHeight 为 0，不可当作「已滚到底」。
  if (element.clientHeight <= 0) return false;
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}
