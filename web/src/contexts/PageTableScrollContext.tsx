import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef } from "react";

type ScrollListener = (scrollTop: number) => void;

type PageTableScrollContextValue = {
  notifyScroll: (scrollTop: number) => void;
  subscribeScroll: (listener: ScrollListener) => () => void;
};

const PageTableScrollContext = createContext<PageTableScrollContextValue | null>(null);

/** 表格页滚动通知：筛选项在表格向下滚动时自动收起。 */
export function PageTableScrollProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef(new Set<ScrollListener>());

  const notifyScroll = useCallback((scrollTop: number) => {
    for (const listener of listenersRef.current) {
      listener(scrollTop);
    }
  }, []);

  const subscribeScroll = useCallback((listener: ScrollListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({
      notifyScroll,
      subscribeScroll,
    }),
    [notifyScroll, subscribeScroll],
  );

  return <PageTableScrollContext.Provider value={value}>{children}</PageTableScrollContext.Provider>;
}

export function usePageTableScroll() {
  const ctx = useContext(PageTableScrollContext);
  if (!ctx) {
    throw new Error("usePageTableScroll 须在 PageTableScrollProvider 内使用");
  }
  return ctx;
}

export function useOptionalPageTableScroll() {
  return useContext(PageTableScrollContext);
}
