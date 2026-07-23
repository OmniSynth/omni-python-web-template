import { useEffect } from "react";
import {
  type PageFilterToolbarMobileHeaderState,
  usePageFilterToolbarContext,
} from "@/components/layout/page-filter-toolbar-context";

type MobileHeaderLayout = {
  showActionBar: boolean;
  needsCollapse: boolean;
  expanded: boolean;
  toggleExpanded: () => void;
};

/** 手机端页头筛选状态同步：仅在布局字段变化时更新，避免无限重渲染。 */
export function usePageFilterToolbarMobileSync(hiddenActiveCount: number, layout: MobileHeaderLayout) {
  const filterCtx = usePageFilterToolbarContext();

  useEffect(() => {
    if (!filterCtx?.mobileActionsInHeader) return;
    filterCtx.setMobileHeaderState((prev: PageFilterToolbarMobileHeaderState) => {
      if (
        prev.showActionBar === layout.showActionBar &&
        prev.showCollapse === layout.needsCollapse &&
        prev.expanded === layout.expanded &&
        prev.hiddenActiveCount === hiddenActiveCount &&
        prev.toggleExpanded === layout.toggleExpanded
      ) {
        return prev;
      }
      return {
        ...prev,
        showActionBar: layout.showActionBar,
        showCollapse: layout.needsCollapse,
        expanded: layout.expanded,
        hiddenActiveCount,
        toggleExpanded: layout.toggleExpanded,
      };
    });
  }, [
    filterCtx?.mobileActionsInHeader,
    filterCtx?.setMobileHeaderState,
    hiddenActiveCount,
    layout.expanded,
    layout.needsCollapse,
    layout.showActionBar,
    layout.toggleExpanded,
  ]);
}
