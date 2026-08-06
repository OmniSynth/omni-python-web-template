import { FilterClearableControl } from "@/components/form/filter-clearable-control";
import { FilterField } from "@/components/form/filter-field";
import {
  Page,
  PageBody,
  PageFilterToolbar,
  PageHeader,
  PageMessage,
  TablePagination,
} from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { mobileServerInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerMobileInfiniteScroll } from "@/hooks/use-server-mobile-infinite-scroll";
import type { ExportJobRecord } from "@/types/export-job";
import { exportListDisplayName } from "./hooks/use-download-center-columns";
import { useDownloadCenterPage } from "./hooks/use-download-center-page";

export function DownloadCenterPage() {
  const page = useDownloadCenterPage();
  const { mobileRows, infiniteScroll } = useServerMobileInfiniteScroll({
    pageRows: page.rows,
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
    resetKey: `${page.keyword}|${page.status}|${page.pageSize}`,
    onPageChange: page.setPage,
    rowKey: (row) => row.id,
  });
  const mobileTable = mobileTableProps<ExportJobRecord>({
    titleColumnId: "filename",
    detailTitle: (row) => exportListDisplayName(row),
  });

  return (
    <Page>
      <PageHeader
        title="下载中心"
        subtitle="查看本人导出记录、进度，并下载已完成的 Excel"
        action={
          <TableHeaderActions
            settings={<TableSettingsButton title="下载中心" onClick={() => page.tablePrefs.setSettingsOpen(true)} />}
            mobileLayoutToggle
          />
        }
      />
      <PageBody layout="table">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <PageFilterToolbar>
          <FilterField label="搜索" htmlFor="export-job-keyword">
            <FilterClearableControl
              clearVisible={page.keyword.trim().length > 0}
              clearLabel="清空搜索"
              onClear={() => page.setKeyword("")}
            >
              <Input
                id="export-job-keyword"
                value={page.keyword}
                onChange={(e) => page.setKeyword(e.target.value)}
                placeholder="名称 / 来源"
              />
            </FilterClearableControl>
          </FilterField>
          <FilterField label="状态" htmlFor="export-job-status">
            <Select
              value={page.status || "__all__"}
              onValueChange={(v) => page.setStatus(!v || v === "__all__" ? "" : v)}
              options={[
                { value: "__all__", label: "全部" },
                { value: "queued", label: "排队中" },
                { value: "running", label: "导出中" },
                { value: "done", label: "已完成" },
                { value: "failed", label: "失败" },
              ]}
            >
              <SelectTrigger id="export-job-status">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部</SelectItem>
                <SelectItem value="queued">排队中</SelectItem>
                <SelectItem value="running">导出中</SelectItem>
                <SelectItem value="done">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </PageFilterToolbar>
        <ConfigurableTable
          minWidth={1100}
          rows={mobileRows}
          columns={page.tablePrefs.resolvedColumns}
          rowHeight={page.tablePrefs.rowHeight}
          sort={page.tablePrefs.sort}
          actionsColumnPref={page.tablePrefs.config.columns.actions}
          rowKey={(row) => String(row.id)}
          onSort={page.tablePrefs.cycleSort}
          onColumnWidthsChange={page.tablePrefs.setColumnWidths}
          emptyMessage="暂无导出记录"
          {...mobileTable}
          {...mobileServerInfiniteScroll(mobileRows, infiniteScroll)}
          mobileTotal={page.total}
        />
        <TablePagination
          total={page.total}
          page={page.page}
          pageSize={page.pageSize}
          onPageChange={page.setPage}
          onPageSizeChange={page.setPageSize}
        />
      </PageBody>
      <TableColumnSettingsSheet
        title="下载中心"
        open={page.tablePrefs.settingsOpen}
        onOpenChange={page.tablePrefs.setSettingsOpen}
        config={page.tablePrefs.config}
        defaultColumns={page.columns}
        onUpdateColumn={page.tablePrefs.updateColumn}
        onReorder={page.tablePrefs.reorderColumns}
        onSetRowHeight={page.tablePrefs.setRowHeight}
        onResetColumn={page.tablePrefs.resetColumn}
        onResetAll={() => void page.tablePrefs.resetAll()}
      />
    </Page>
  );
}
