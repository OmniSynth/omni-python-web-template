import type { ReactNode } from "react";
import { usePageFilterToolbarContext } from "@/components/layout/page-filter-toolbar-context";
import {
  PageFilterToolbarDesktop,
  PageFilterToolbarMobileCollapsed,
  PageFilterToolbarMobileExpanded,
} from "@/components/layout/page-filter-toolbar-layouts";
import { usePageFilterToolbarMobileSync } from "@/hooks/use-page-filter-toolbar-mobile-sync";
import { usePageFilterToolbarLayout } from "@/hooks/usePageFilterToolbarLayout";

export interface PageFilterToolbarProps {
  children: ReactNode;
  hiddenActiveCount?: number;
  defaultExpanded?: boolean;
  actions?: ReactNode;
  className?: string;
}

/** 筛选工具栏：stretch 行末列跨至查询按钮右缘；action 行固定列宽；按钮最多 3 个。 */
export function PageFilterToolbar({
  children,
  hiddenActiveCount = 0,
  defaultExpanded,
  actions,
  className,
}: PageFilterToolbarProps) {
  const filterCtx = usePageFilterToolbarContext();
  const mobileActionsInHeader = filterCtx?.mobileActionsInHeader ?? false;

  const layout = usePageFilterToolbarLayout(children, {
    defaultExpanded,
    hiddenActiveCount,
    hasActions: actions != null,
    mobileActionsInHeader,
  });

  usePageFilterToolbarMobileSync(hiddenActiveCount, layout);

  // 仅手机端把展开/操作挪到页头；桌面端必须留在工具栏，否则折叠字段无法展开。
  const hoistToHeader = layout.mobileActionsInHeader;
  const toolbarActions = hoistToHeader ? null : actions;
  const toolbarCollapseButton = hoistToHeader ? null : layout.collapseButton;
  const toolbarShowActionBar = hoistToHeader ? false : layout.showActionBar;

  const actionBarStyle = layout.desktopActionGrid
    ? {
        gridColumn: layout.colsPerRow + 1,
        gridRow: layout.hasStretchRows ? layout.actionRowIndex : 1,
      }
    : undefined;

  if (layout.isMobile && !layout.isFullyExpanded) {
    if (layout.mobileActionsInHeader) {
      return null;
    }
    return (
      <PageFilterToolbarMobileCollapsed
        className={className}
        showActionBar={toolbarShowActionBar}
        actionBarClassName={layout.actionBarClassName}
        collapseButton={toolbarCollapseButton}
        actions={toolbarActions}
      />
    );
  }

  if (layout.mobileExpandedLayout) {
    return (
      <PageFilterToolbarMobileExpanded
        className={className}
        stretchRows={layout.stretchRows}
        actionBarClassName={layout.actionBarClassName}
        collapseButton={toolbarCollapseButton}
        actions={toolbarActions}
      />
    );
  }

  return (
    <PageFilterToolbarDesktop
      className={className}
      desktopActionGrid={layout.desktopActionGrid}
      colsPerRow={layout.colsPerRow}
      stretchRows={layout.stretchRows}
      actionRowFields={layout.actionRowFields ?? undefined}
      actionFieldRenderCount={layout.actionFieldRenderCount}
      actionFieldCount={layout.actionFieldCount}
      hasStretchRows={layout.hasStretchRows}
      actionRowIndex={layout.actionRowIndex}
      visibleFieldCount={layout.visibleFieldCount}
      actionBarStyle={actionBarStyle}
      actionBarClassName={layout.actionBarClassName}
      collapseButton={toolbarCollapseButton}
      actions={toolbarActions}
    />
  );
}
