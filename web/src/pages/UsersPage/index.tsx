import { Can } from "@/components/Can";
import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { TableHeaderButton } from "@/components/table/table-header-button";
import { mobileClientInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import type { UserRecord } from "@/types/auth";
import { UsersPageDialogs } from "./components/users-page-dialogs";
import { useUsersPage } from "./hooks/use-users-page";

const MOBILE_TABLE = mobileTableProps<UserRecord>({
  titleColumnId: "display_name",
  detailTitle: (user) => user.display_name,
});

export function UsersPage() {
  const page = useUsersPage();
  const pagination = page.userTable.pagination;

  return (
    <Page>
      <PageHeader
        title="用户管理"
        action={
          <TableHeaderActions
            settings={<TableSettingsButton title="用户管理" onClick={() => page.userTable.setSettingsOpen(true)} />}
            mobileLayoutToggle
          >
            <Can permission={page.userPerm("system.user.create", "tenant.user.create")}>
              <TableHeaderButton type="button" mobileLabel="新建" onClick={() => void page.openCreate()}>
                新建用户
              </TableHeaderButton>
            </Can>
          </TableHeaderActions>
        }
      />
      <PageBody layout="table">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <ConfigurableTable
          rows={pagination.items}
          columns={page.userTable.resolvedColumns}
          rowHeight={page.userTable.rowHeight}
          sort={page.userTable.sort}
          actionsColumnPref={page.userTable.config.columns.actions}
          minWidth={800}
          rowKey={(u) => u.id}
          onSort={page.userTable.cycleSort}
          onColumnWidthsChange={page.userTable.setColumnWidths}
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

      <UsersPageDialogs page={page} />

      <TableColumnSettingsSheet
        title="用户管理"
        open={page.userTable.settingsOpen}
        onOpenChange={page.userTable.setSettingsOpen}
        config={page.userTable.config}
        defaultColumns={page.userColumns}
        onUpdateColumn={page.userTable.updateColumn}
        onReorder={page.userTable.reorderColumns}
        onSetRowHeight={page.userTable.setRowHeight}
        onResetColumn={page.userTable.resetColumn}
        onResetAll={() => void page.userTable.resetAll()}
      />
    </Page>
  );
}
