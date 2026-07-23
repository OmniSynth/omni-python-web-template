import { type UIEvent, useCallback, useEffect, useRef } from "react";
import {
  shouldTriggerMobileLoadMore,
  type TableMobileInfiniteScrollProps,
} from "@/components/table/table-mobile-infinite-scroll";

/** 滚动接近底部时触发加载下一页；加载完成或条数变化后允许再次触发。 */
export function useMobileScrollLoadMore(infiniteScroll?: TableMobileInfiniteScrollProps) {
  const armedRef = useRef(true);
  const loadedCountRef = useRef(infiniteScroll?.loadedCount ?? 0);

  useEffect(() => {
    if (!infiniteScroll) return;
    if (infiniteScroll.loadedCount !== loadedCountRef.current) {
      loadedCountRef.current = infiniteScroll.loadedCount;
      armedRef.current = true;
    }
  }, [infiniteScroll]);

  useEffect(() => {
    if (!infiniteScroll?.loading) {
      armedRef.current = true;
    }
  }, [infiniteScroll?.loading]);

  return useCallback(
    (event: UIEvent<HTMLElement>) => {
      if (!infiniteScroll?.hasMore || infiniteScroll.loading || !armedRef.current) return;
      if (!shouldTriggerMobileLoadMore(event.currentTarget)) return;
      armedRef.current = false;
      infiniteScroll.onLoadMore();
    },
    [infiniteScroll],
  );
}
