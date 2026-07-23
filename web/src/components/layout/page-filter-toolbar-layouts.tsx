import type { CSSProperties, ReactNode } from "react";
import { FilterToolbarActions } from "@/components/layout/FilterToolbarActions";
import {
  filterFieldCellClass,
  filterFieldCellStretchClass,
  filterPanelRowStretchClass,
  filterToolbarGridClass,
  filterToolbarGridMobileExpandedClass,
} from "@/lib/field-control";
import { filterToolbarGridStyle, resolveActionFieldGridColumn, resolveStretchFieldGridColumn } from "@/lib/filter-grid";
import { cn } from "@/lib/utils";

interface PageFilterToolbarMobileCollapsedProps {
  className?: string;
  showActionBar: boolean;
  actionBarClassName: string | undefined;
  collapseButton: ReactNode;
  actions: ReactNode;
}

export function PageFilterToolbarMobileCollapsed({
  className,
  showActionBar,
  actionBarClassName,
  collapseButton,
  actions,
}: PageFilterToolbarMobileCollapsedProps) {
  return (
    <div className={cn("shrink-0 border-b border-border px-6 py-3", className)}>
      {showActionBar ? (
        <FilterToolbarActions className={actionBarClassName}>
          {collapseButton}
          {actions}
        </FilterToolbarActions>
      ) : null}
    </div>
  );
}

interface PageFilterToolbarMobileExpandedProps {
  className?: string;
  stretchRows: ReactNode[][];
  actionBarClassName: string | undefined;
  collapseButton: ReactNode;
  actions: ReactNode;
}

export function PageFilterToolbarMobileExpanded({
  className,
  stretchRows,
  actionBarClassName,
  collapseButton,
  actions,
}: PageFilterToolbarMobileExpandedProps) {
  return (
    <div className={cn("shrink-0 border-b border-border px-6 py-3", className)}>
      <div className={cn(filterToolbarGridClass, filterToolbarGridMobileExpandedClass)}>
        {stretchRows.map((rowFields, rowIndex) => (
          <div key={`mobile-stretch-${rowIndex}`} className={filterPanelRowStretchClass}>
            {rowFields.map((field, cellIndex) => (
              <div key={cellIndex} className={filterFieldCellStretchClass}>
                {field}
              </div>
            ))}
          </div>
        ))}
        <FilterToolbarActions className={actionBarClassName}>
          {collapseButton}
          {actions}
        </FilterToolbarActions>
      </div>
    </div>
  );
}

interface PageFilterToolbarDesktopProps {
  className?: string;
  desktopActionGrid: boolean;
  colsPerRow: number;
  stretchRows: ReactNode[][];
  actionRowFields: ReactNode[] | undefined;
  actionFieldRenderCount: number;
  actionFieldCount: number;
  hasStretchRows: boolean;
  actionRowIndex: number;
  visibleFieldCount: number;
  actionBarStyle: CSSProperties | undefined;
  actionBarClassName: string | undefined;
  collapseButton: ReactNode;
  actions: ReactNode;
}

export function PageFilterToolbarDesktop({
  className,
  desktopActionGrid,
  colsPerRow,
  stretchRows,
  actionRowFields,
  actionFieldRenderCount,
  actionFieldCount,
  hasStretchRows,
  actionRowIndex,
  visibleFieldCount,
  actionBarStyle,
  actionBarClassName,
  collapseButton,
  actions,
}: PageFilterToolbarDesktopProps) {
  return (
    <div className={cn("shrink-0 border-b border-border px-6 py-3", className)}>
      <div
        className={cn(filterToolbarGridClass, desktopActionGrid ? "items-end" : "grid-cols-1 items-end")}
        style={desktopActionGrid ? filterToolbarGridStyle(colsPerRow) : undefined}
      >
        {desktopActionGrid
          ? stretchRows.flatMap((rowFields, rowIndex) =>
              rowFields.map((field, cellIndex) => (
                <div
                  key={`stretch-${rowIndex}-${cellIndex}`}
                  className={filterFieldCellClass}
                  style={{
                    gridColumn: resolveStretchFieldGridColumn(cellIndex, rowFields.length),
                    gridRow: rowIndex + 1,
                  }}
                >
                  {field}
                </div>
              )),
            )
          : stretchRows.flatMap((rowFields, rowIndex) =>
              rowFields.map((field, cellIndex) => (
                <div
                  key={`stretch-${rowIndex}-${cellIndex}`}
                  className={filterFieldCellStretchClass}
                  style={{ gridColumn: cellIndex + 1, gridRow: rowIndex + 1 }}
                >
                  {field}
                </div>
              )),
            )}

        {actionRowFields
          ? actionRowFields.slice(0, actionFieldRenderCount).map((field, cellIndex) => (
              <div
                key={`action-${cellIndex}`}
                className={filterFieldCellClass}
                style={{
                  gridColumn: resolveActionFieldGridColumn(cellIndex, actionFieldCount, colsPerRow, hasStretchRows),
                  gridRow: desktopActionGrid ? actionRowIndex : 1,
                }}
              >
                {field}
              </div>
            ))
          : null}

        {visibleFieldCount === 0 ? <div className="min-w-0" style={{ gridColumn: 1, gridRow: 1 }} /> : null}

        <FilterToolbarActions className={actionBarClassName} style={actionBarStyle}>
          {collapseButton}
          {actions}
        </FilterToolbarActions>
      </div>
    </div>
  );
}
