import { Can } from "@/components/Can";
import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { mobileClientInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import type { DevParamGroupSummary } from "@/types/dev-param";
import { DevParamGroupDetailSheet } from "./components/dev-param-group-detail-sheet";
import { DevParamGroupEditSheet } from "./components/dev-param-group-edit-sheet";
import { useDevParamsPage } from "./hooks/use-dev-params-page";

const MOBILE_TABLE = mobileTableProps<DevParamGroupSummary>({
  titleColumnId: "name",
  detailTitle: (group) => group.name,
});

export function DevParamsPage() {
  const page = useDevParamsPage();
  const pagination = page.devParamTable.pagination;

  return (
    <Page>
      <PageHeader
        title="开发参数"
        action={
          <TableHeaderActions
            settings={<TableSettingsButton title="开发参数" onClick={() => page.devParamTable.setSettingsOpen(true)} />}
            mobileLayoutToggle
          />
        }
      />
      <PageBody layout="table">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <ConfigurableTable
          minWidth={1080}
          rows={pagination.items}
          columns={page.devParamTable.resolvedColumns}
          rowHeight={page.devParamTable.rowHeight}
          sort={page.devParamTable.sort}
          actionsColumnPref={page.devParamTable.config.columns.actions}
          rowKey={(group) => group.id}
          onSort={page.devParamTable.cycleSort}
          onColumnWidthsChange={page.devParamTable.setColumnWidths}
          emptyMessage="暂无开发参数分组"
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

      <Can permission="dev_param.update">
        <DevParamGroupEditSheet
          open={page.groupEditOpen}
          onOpenChange={page.setGroupEditOpen}
          name={page.groupName}
          description={page.groupDescription}
          params={page.paramDrafts}
          saving={page.groupSaving}
          onNameChange={page.setGroupName}
          onDescriptionChange={page.setGroupDescription}
          onParamValueChange={(paramKey, value) => page.updateParamDraft(paramKey, { param_value: value })}
          onParamRemarkChange={(paramKey, value) => page.updateParamDraft(paramKey, { remark: value })}
          onSave={() => void page.handleSaveGroup()}
        />
      </Can>

      <DevParamGroupDetailSheet
        detail={page.detail}
        open={page.detailOpen}
        onOpenChange={page.setDetailOpen}
        formatDateTime={page.formatDateTime}
      />

      <TableColumnSettingsSheet
        title="开发参数"
        open={page.devParamTable.settingsOpen}
        onOpenChange={page.devParamTable.setSettingsOpen}
        config={page.devParamTable.config}
        defaultColumns={page.devParamColumns}
        onUpdateColumn={page.devParamTable.updateColumn}
        onReorder={page.devParamTable.reorderColumns}
        onSetRowHeight={page.devParamTable.setRowHeight}
        onResetColumn={page.devParamTable.resetColumn}
        onResetAll={() => void page.devParamTable.resetAll()}
      />
    </Page>
  );
}
