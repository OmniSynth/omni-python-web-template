import { Children, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOptionalPageTableScroll } from "@/contexts/PageTableScrollContext";
import { useFilterGridConfig } from "@/hooks/useFilterGridConfig";
import { filterPanelActionsMobileClass, filterToolbarButtonClass } from "@/lib/field-control";
import {
  chunkFilterFields,
  resolveActionFieldRenderCount,
  resolveFilterColsPerRow,
  resolveFilterToolbarRowLayout,
} from "@/lib/filter-grid";

function resolveNeedsCollapse(fieldCount: number, isMobile: boolean, maxColsPerRow: number): boolean {
  if (fieldCount === 0) return false;
  if (isMobile) return true;
  return fieldCount > maxColsPerRow;
}

function resolveCollapsedVisibleCount(fieldCount: number, isMobile: boolean, maxColsPerRow: number): number {
  if (isMobile) return 0;
  return Math.min(fieldCount, maxColsPerRow);
}

export type PageFilterToolbarLayoutOptions = {
  defaultExpanded?: boolean;
  hiddenActiveCount: number;
  hasActions: boolean;
  mobileActionsInHeader?: boolean;
};

export function usePageFilterToolbarLayout(children: ReactNode, options: PageFilterToolbarLayoutOptions) {
  const { isMobile, maxColsPerRow } = useFilterGridConfig();
  const allFields = useMemo(() => Children.toArray(children), [children]);
  const fieldCount = allFields.length;

  const needsCollapse = resolveNeedsCollapse(fieldCount, isMobile, maxColsPerRow);
  const collapsedVisibleCount = resolveCollapsedVisibleCount(fieldCount, isMobile, maxColsPerRow);

  const [expanded, setExpanded] = useState(() =>
    options.defaultExpanded !== undefined ? options.defaultExpanded : false,
  );
  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);
  const isFullyExpanded = !needsCollapse || expanded;
  const scrollCtx = useOptionalPageTableScroll();

  useEffect(() => {
    if (!scrollCtx || !needsCollapse) return;
    return scrollCtx.subscribeScroll((scrollTop) => {
      if (scrollTop > 0) {
        setExpanded(false);
      }
    });
  }, [needsCollapse, scrollCtx]);

  const visibleFields = useMemo(() => {
    if (isFullyExpanded) return allFields;
    return allFields.slice(0, collapsedVisibleCount);
  }, [allFields, isFullyExpanded, collapsedVisibleCount]);

  const colsPerRow = resolveFilterColsPerRow(isMobile, maxColsPerRow);
  const fieldRows = useMemo(() => chunkFilterFields(visibleFields, colsPerRow), [visibleFields, colsPerRow]);

  const mobileExpandedLayout = isMobile && isFullyExpanded;
  const showActionBar = needsCollapse || options.hasActions;
  const desktopActionGrid = showActionBar && !mobileExpandedLayout;
  const mobileActionsInHeader = Boolean(options.mobileActionsInHeader && isMobile);

  const { stretchRows, actionRowFields } = useMemo(
    () =>
      resolveFilterToolbarRowLayout(fieldRows, {
        showActionBar: mobileActionsInHeader ? showActionBar && !isMobile : showActionBar,
        mobileExpandedLayout,
      }),
    [fieldRows, showActionBar, mobileExpandedLayout, mobileActionsInHeader, isMobile],
  );

  const hasStretchRows = stretchRows.length > 0;
  const actionFieldCount = actionRowFields?.length ?? 0;

  const collapseButton = needsCollapse ? (
    <Button
      type="button"
      variant="outline"
      className={filterToolbarButtonClass}
      aria-expanded={expanded}
      onClick={toggleExpanded}
    >
      {expanded ? "收起" : "展开"}
      {!expanded && options.hiddenActiveCount > 0 ? (
        <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
          {options.hiddenActiveCount}
        </Badge>
      ) : null}
    </Button>
  ) : null;

  return {
    isMobile,
    isFullyExpanded,
    mobileExpandedLayout,
    showActionBar,
    mobileActionsInHeader,
    needsCollapse,
    expanded,
    toggleExpanded,
    desktopActionGrid,
    colsPerRow,
    stretchRows,
    actionRowFields,
    visibleFieldCount: visibleFields.length,
    collapseButton,
    actionBarClassName: isMobile && !mobileActionsInHeader ? filterPanelActionsMobileClass : undefined,
    hasStretchRows,
    actionRowIndex: stretchRows.length + 1,
    actionFieldCount,
    actionFieldRenderCount: resolveActionFieldRenderCount(actionFieldCount, hasStretchRows),
  };
}
