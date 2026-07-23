import { useMemo } from "react";
import { PageBody, PageMessage, PageTabBar, TablePagination } from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { mobileServerInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import { useServerMobileInfiniteScroll } from "@/hooks/use-server-mobile-infinite-scroll";
import type { TableColumnDef } from "@/types/table-preference";
import type { useAuditLogsPage } from "../hooks/use-audit-logs-page";
import { type AuditTabRow, TAB_LABEL } from "../types";
import { AuditFilterToolbar } from "./audit-filter-toolbar";

type AuditLogsPageState = ReturnType<typeof useAuditLogsPage>;

type AuditLogsPageBodyProps = {
  page: AuditLogsPageState;
  mobileStorageKey: string;
};

function auditMobileTitleColumnId(tab: AuditLogsPageState["tab"]): string {
  if (tab === "requests") return "path";
  if (tab === "operations") return "summary";
  return "http_path";
}

export function AuditLogsPageBody({ page, mobileStorageKey }: AuditLogsPageBodyProps) {
  const mobileTable = mobileTableProps<AuditTabRow>({
    titleColumnId: auditMobileTitleColumnId(page.tab),
  });

  const infiniteResetKey = useMemo(
    () =>
      [
        mobileStorageKey,
        page.dateRange.from,
        page.dateRange.to,
        page.keyword,
        page.level,
        page.tier,
        page.severity,
        page.requestId,
      ].join("|"),
    [
      mobileStorageKey,
      page.dateRange.from,
      page.dateRange.to,
      page.keyword,
      page.level,
      page.tier,
      page.severity,
      page.requestId,
    ],
  );

  const { mobileRows, infiniteScroll } = useServerMobileInfiniteScroll({
    pageRows: page.activeRows,
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
    onPageChange: page.setPage,
    rowKey: (row) => row.id,
    resetKey: infiniteResetKey,
    loading: page.loading,
  });

  return (
    <PageBody layout="table">
      {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}

      <PageTabBar
        value={page.tab}
        onValueChange={(v) => page.handleTabChange(v as typeof page.tab)}
        tabs={[
          { value: "requests", label: "请求" },
          { value: "operations", label: "操作" },
          { value: "slow-sql", label: "慢 SQL" },
        ]}
      />

      <AuditFilterToolbar
        tab={page.tab}
        dateRange={page.dateRange}
        keyword={page.keyword}
        level={page.level}
        tier={page.tier}
        severity={page.severity}
        requestId={page.requestId}
        hiddenFilterActiveCount={page.hiddenFilterActiveCount}
        exporting={page.exporting}
        onDateRangeChange={(value) => page.applyFilterChange(page.setDateRange, value)}
        onKeywordChange={(value) => page.applyFilterChange(page.setKeyword, value)}
        onLevelChange={(value) => page.applyFilterChange(page.setLevel, value)}
        onTierChange={(value) => page.applyFilterChange(page.setTier, value)}
        onSeverityChange={(value) => page.applyFilterChange(page.setSeverity, value)}
        onRequestIdChange={(value) => page.applyFilterChange(page.setRequestId, value)}
        onExport={page.handleExport}
      />

      <ConfigurableTable<AuditTabRow>
        key={mobileStorageKey}
        minWidth={page.activeTableMeta.minWidth}
        rows={page.activeRows}
        columns={page.tablePrefs.resolvedColumns}
        rowHeight={page.tablePrefs.rowHeight}
        sort={page.tablePrefs.sort}
        rowKey={(row) => row.id}
        onSort={page.tablePrefs.cycleSort}
        onColumnWidthsChange={page.tablePrefs.setColumnWidths}
        emptyMessage="暂无记录"
        getRowClassName={() => "cursor-pointer"}
        onRowClick={page.handleRowClick}
        {...mobileTable}
        {...mobileServerInfiniteScroll(mobileRows, infiniteScroll)}
        mobileTotal={page.total}
      />

      <TablePagination
        total={page.total}
        page={page.page}
        pageSize={page.pageSize}
        onPageChange={page.setPage}
        onPageSizeChange={page.handlePageSizeChange}
      />
    </PageBody>
  );
}

export function auditTableSettingsSubtitle(tab: AuditLogsPageState["tab"]) {
  return TAB_LABEL[tab];
}

export function auditTableDefaultColumns(page: AuditLogsPageState) {
  return page.activeTableMeta.columns as TableColumnDef<AuditTabRow>[];
}
