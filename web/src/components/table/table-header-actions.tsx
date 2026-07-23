import type { ReactNode } from "react";
import { PageHeaderActionsRow } from "@/components/layout/page-header-actions-row";
import type { TableMobileLayout } from "@/components/table/table-mobile-layout";
import { TableMobileLayoutToggle } from "@/components/table/table-mobile-layout-toggle";
import { cn } from "@/lib/utils";

type TableHeaderActionsProps = {
  /** 业务/筛选功能按钮（新建、导出、筛选展开等），位于「自定义字段」左侧。 */
  children?: ReactNode;
  /** 「自定义字段」按钮；位于布局切换 icon 左侧。 */
  settings?: ReactNode;
  /** 显示手机端表格布局切换 icon（全局偏好，位于最右侧）。 */
  mobileLayoutToggle?: boolean;
  /** 无全局偏好时的默认布局。 */
  mobileLayoutDefault?: TableMobileLayout;
  className?: string;
};

/** 列表页 PageHeader 操作区：功能按钮 → 自定义字段 → 手机布局 icon，手机端单行不换行。 */
export function TableHeaderActions({
  children,
  settings,
  mobileLayoutToggle,
  mobileLayoutDefault,
  className,
}: TableHeaderActionsProps) {
  return (
    <PageHeaderActionsRow className={cn(className)}>
      {children}
      {settings}
      {mobileLayoutToggle ? <TableMobileLayoutToggle defaultLayout={mobileLayoutDefault} /> : null}
    </PageHeaderActionsRow>
  );
}
