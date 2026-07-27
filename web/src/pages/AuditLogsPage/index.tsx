import { Can } from "@/components/Can";
import { Page, PageHeader } from "@/components/layout/AppShell";
import {
  PageFilterToolbarHeaderActions,
  PageFilterToolbarProvider,
} from "@/components/layout/page-filter-toolbar-context";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { TableHeaderButton } from "@/components/table/table-header-button";
import { AuditDetailSheet } from "./components/audit-detail-sheet";
import {
  AuditLogsPageBody,
  auditTableDefaultColumns,
  auditTableSettingsSubtitle,
} from "./components/audit-logs-page-body";
import { useAuditLogsPage } from "./hooks/use-audit-logs-page";
import { AUDIT_PAGE_TITLE } from "./types";

function AuditExportHeaderButton({ exporting, onExport }: { exporting: boolean; onExport: () => void }) {
  return (
    <Can permission="system.audit.export">
      <TableHeaderButton
        type="button"
        disabled={exporting}
        mobileLabel={exporting ? "导出中" : "导出"}
        onClick={onExport}
      >
        {exporting ? "导出中…" : "导出归档"}
      </TableHeaderButton>
    </Can>
  );
}

export function AuditLogsPage() {
  const page = useAuditLogsPage();
  const mobileStorageKey = `audit.${page.activeTableMeta.tableKey}`;

  return (
    <PageFilterToolbarProvider hiddenActiveCount={page.hiddenFilterActiveCount}>
      <Page>
        <PageHeader
          title="审计日志"
          action={
            <TableHeaderActions
              settings={
                <TableSettingsButton
                  title={AUDIT_PAGE_TITLE}
                  subtitle={auditTableSettingsSubtitle(page.tab)}
                  onClick={() => page.tablePrefs.setSettingsOpen(true)}
                />
              }
              mobileLayoutToggle
            >
              <PageFilterToolbarHeaderActions
                actions={<AuditExportHeaderButton exporting={page.exporting} onExport={page.handleExport} />}
              />
            </TableHeaderActions>
          }
        />
        <AuditLogsPageBody page={page} mobileStorageKey={mobileStorageKey} />

        <AuditDetailSheet
          open={page.detailOpen}
          onOpenChange={page.setDetailOpen}
          formatDateTime={page.formatDateTime}
          requestDetail={page.requestDetail}
          operationDetail={page.operationDetail}
          slowSqlDetail={page.slowSqlDetail}
          jobRunDetail={page.jobRunDetail}
        />

        <TableColumnSettingsSheet
          title={AUDIT_PAGE_TITLE}
          subtitle={auditTableSettingsSubtitle(page.tab)}
          open={page.tablePrefs.settingsOpen}
          onOpenChange={page.tablePrefs.setSettingsOpen}
          config={page.tablePrefs.config}
          defaultColumns={auditTableDefaultColumns(page)}
          onUpdateColumn={page.tablePrefs.updateColumn}
          onReorder={page.tablePrefs.reorderColumns}
          onSetRowHeight={page.tablePrefs.setRowHeight}
          onResetColumn={page.tablePrefs.resetColumn}
          onResetAll={() => void page.tablePrefs.resetAll()}
        />
      </Page>
    </PageFilterToolbarProvider>
  );
}
