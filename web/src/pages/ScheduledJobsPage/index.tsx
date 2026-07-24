import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { mobileClientInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import type { ScheduledJobRecord } from "@/types/scheduled-job";
import { ScheduledJobEditSheet } from "./components/scheduled-job-edit-sheet";
import { ScheduledJobExecuteSheet } from "./components/scheduled-job-execute-sheet";
import { useScheduledJobsPage } from "./hooks/use-scheduled-jobs-page";

const MOBILE_TABLE = mobileTableProps<ScheduledJobRecord>({
  titleColumnId: "name",
  detailTitle: (job) => job.name,
});

export function ScheduledJobsPage() {
  const page = useScheduledJobsPage();
  const pagination = page.table.pagination;

  return (
    <Page>
      <PageHeader
        title="定时任务"
        subtitle="统一管理系统内所有定时任务，可配置执行计划、立即触发与启停调度"
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
          minWidth={1280}
          rows={pagination.items}
          columns={page.table.resolvedColumns}
          rowHeight={page.table.rowHeight}
          sort={page.table.sort}
          actionsColumnPref={page.table.config.columns.actions}
          rowKey={(job) => job.code}
          onSort={page.table.cycleSort}
          onColumnWidthsChange={page.table.setColumnWidths}
          emptyMessage="暂无定时任务"
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

      <ScheduledJobEditSheet
        open={page.sheetOpen}
        onOpenChange={(open) => {
          page.setSheetOpen(open);
          if (!open) {
            page.setEditing(null);
          }
        }}
        editing={page.editing}
        cronExpr={page.cronExpr}
        onCronExprChange={page.setCronExpr}
        sectionError={page.sectionError}
        saving={page.saving}
        onSave={() => void page.handleSave()}
      />

      <ScheduledJobExecuteSheet
        open={page.executeOpen}
        onOpenChange={(open) => {
          page.setExecuteOpen(open);
          if (!open) {
            page.setTriggering(null);
          }
        }}
        job={page.triggering}
        submitting={page.executeSubmitting}
        sectionError={page.executeError}
        onConfirm={(tenantId) => void page.handleConfirmExecute(tenantId)}
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
