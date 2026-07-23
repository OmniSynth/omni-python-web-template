import { Can } from "@/components/Can";
import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { TableHeaderButton } from "@/components/table/table-header-button";
import { mobileClientInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import type { RoleRecord } from "@/types/auth";
import { RolesPageSheets } from "./components/roles-page-sheets";
import { useRolesPage } from "./hooks/use-roles-page";

const MOBILE_TABLE = mobileTableProps<RoleRecord>({
  titleColumnId: "name",
  detailTitle: (role) => role.name,
});

export function RolesPage() {
  const page = useRolesPage();
  const pagination = page.roleTable.pagination;

  return (
    <Page>
      <PageHeader
        title="角色管理"
        action={
          <TableHeaderActions
            settings={<TableSettingsButton title="角色管理" onClick={() => page.roleTable.setSettingsOpen(true)} />}
            mobileLayoutToggle
          >
            <Can permission={page.rolePerm("system.role.create", "tenant.role.create")}>
              <TableHeaderButton type="button" mobileLabel="新建" onClick={page.openCreate}>
                新建角色
              </TableHeaderButton>
            </Can>
          </TableHeaderActions>
        }
      />
      <PageBody layout="table">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <ConfigurableTable
          minWidth={640}
          rows={pagination.items}
          columns={page.roleTable.resolvedColumns}
          rowHeight={page.roleTable.rowHeight}
          sort={page.roleTable.sort}
          actionsColumnPref={page.roleTable.config.columns.actions}
          rowKey={(role) => role.id}
          onSort={page.roleTable.cycleSort}
          onColumnWidthsChange={page.roleTable.setColumnWidths}
          emptyMessage="暂无角色"
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

      <RolesPageSheets page={page} />

      <TableColumnSettingsSheet
        title="角色管理"
        open={page.roleTable.settingsOpen}
        onOpenChange={page.roleTable.setSettingsOpen}
        config={page.roleTable.config}
        defaultColumns={page.roleColumns}
        onUpdateColumn={page.roleTable.updateColumn}
        onReorder={page.roleTable.reorderColumns}
        onSetRowHeight={page.roleTable.setRowHeight}
        onResetColumn={page.roleTable.resetColumn}
        onResetAll={() => void page.roleTable.resetAll()}
      />
    </Page>
  );
}
