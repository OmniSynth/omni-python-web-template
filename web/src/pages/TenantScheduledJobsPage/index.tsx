import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ScheduledJobRunsSheet } from "@/components/scheduled-job-runs";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { mobileClientInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import type { TenantScheduledJobRecord } from "@/types/scheduled-job";
import { useTenantScheduledJobsPage } from "./hooks/use-tenant-scheduled-jobs-page";

const MOBILE_TABLE = mobileTableProps<TenantScheduledJobRecord>({
  titleColumnId: "name",
  detailTitle: (job) => job.name,
});

/** 租户设置：仅手动触发租户范围任务，用于临时刷新数据。 */
export function TenantScheduledJobsPage() {
  const page = useTenantScheduledJobsPage();
  const pagination = page.table.pagination;

  return (
    <Page>
      <PageHeader
        title="定时任务"
        subtitle="手动触发本租户同步任务，用于临时刷新数据；同一任务同时仅执行一次"
        action={
          <TableHeaderActions
            settings={<TableSettingsButton title="定时任务" onClick={() => page.table.setSettingsOpen(true)} />}
            mobileLayoutToggle
          />
        }
      />
      <PageBody layout="table">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <ConfigurableTable
          minWidth={960}
          rows={pagination.items}
          columns={page.table.resolvedColumns}
          rowHeight={page.table.rowHeight}
          sort={page.table.sort}
          actionsColumnPref={page.table.config.columns.actions}
          rowKey={(job) => job.code}
          onSort={page.table.cycleSort}
          onColumnWidthsChange={page.table.setColumnWidths}
          emptyMessage="暂无可执行的租户定时任务"
          {...MOBILE_TABLE}
          {...mobileClientInfiniteScroll(pagination)}
          mobileTotal={pagination.total}
        />
        <TablePagination
          total={pagination.total}
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </PageBody>
      <ScheduledJobRunsSheet
        open={page.historyOpen}
        onOpenChange={page.setHistoryOpen}
        jobCode={page.historyJob?.code ?? null}
        jobName={page.historyJob?.name}
        scope="tenant"
      />
      <TableColumnSettingsSheet
        title="定时任务"
        open={page.table.settingsOpen}
        onOpenChange={page.table.setSettingsOpen}
        config={page.table.config}
        defaultColumns={page.columns}
        onUpdateColumn={page.table.updateColumn}
        onReorder={page.table.reorderColumns}
        onSetRowHeight={page.table.setRowHeight}
        onResetColumn={page.table.resetColumn}
        onResetAll={() => void page.table.resetAll()}
      />
    </Page>
  );
}
