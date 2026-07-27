import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ScheduledJobRunsSheet } from "@/components/scheduled-job-runs";
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
  const isStopMode = page.tenantSheetMode === "stop";

  return (
    <Page>
      <PageHeader
        title="定时任务"
        subtitle="统一管理系统与租户定时任务，可配置执行计划、立即触发与启停调度"
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
          minWidth={1360}
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
        cronEditorKey={page.cronEditorKey}
        sectionError={page.sectionError}
        saving={page.saving}
        onSave={() => void page.handleSave()}
      />

      <ScheduledJobExecuteSheet
        open={page.tenantSheetOpen}
        onOpenChange={(open) => {
          page.setTenantSheetOpen(open);
          if (!open) {
            page.setTargeting(null);
          }
        }}
        job={page.targeting}
        submitting={page.tenantSheetSubmitting}
        sectionError={page.tenantSheetError}
        title={isStopMode ? "停止租户调度" : "执行定时任务"}
        confirmLabel={isStopMode ? "停止该租户" : "确认执行"}
        onConfirm={(tenantId) => void page.handleConfirmTenantSheet(tenantId)}
        onConfirmGlobal={isStopMode ? () => void page.handleConfirmGlobalStop() : undefined}
      />

      <ScheduledJobRunsSheet
        open={page.historyOpen}
        onOpenChange={page.setHistoryOpen}
        jobCode={page.historyJob?.code ?? null}
        jobName={page.historyJob?.name}
        scope="platform"
        showTenantId={page.historyJob?.scope === "tenant"}
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
