import { Can } from "@/components/Can";
import { CredentialsDialog } from "@/components/CredentialsDialog";
import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { TableHeaderButton } from "@/components/table/table-header-button";
import { mobileClientInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import type { OrganizationRecord } from "@/types/auth";
import { OrgFormSheet } from "./components/org-form-sheet";
import { useOrgsPage } from "./hooks/use-orgs-page";

const MOBILE_TABLE = mobileTableProps<OrganizationRecord>({
  titleColumnId: "name",
  detailTitle: (org) => org.name,
});

export function OrgsPage() {
  const page = useOrgsPage();
  const pagination = page.orgTable.pagination;

  return (
    <Page>
      <PageHeader
        title="机构管理"
        action={
          <TableHeaderActions
            settings={<TableSettingsButton title="机构管理" onClick={() => page.orgTable.setSettingsOpen(true)} />}
            mobileLayoutToggle
          >
            <Can permission="system.org.create">
              <TableHeaderButton type="button" mobileLabel="新建" onClick={() => void page.openCreate()}>
                新建机构
              </TableHeaderButton>
            </Can>
          </TableHeaderActions>
        }
      />
      <PageBody layout="table">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        <ConfigurableTable
          rows={pagination.items}
          columns={page.orgTable.resolvedColumns}
          rowHeight={page.orgTable.rowHeight}
          sort={page.orgTable.sort}
          actionsColumnPref={page.orgTable.config.columns.actions}
          rowKey={(o) => o.id}
          onSort={page.orgTable.cycleSort}
          onColumnWidthsChange={page.orgTable.setColumnWidths}
          emptyMessage="暂无机构"
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

      <OrgFormSheet
        open={page.sheetOpen}
        onOpenChange={(open) => {
          page.setSheetOpen(open);
          if (!open) {
            page.setEditing(null);
            page.clearFieldErrors();
            page.setSectionError("");
          }
        }}
        editing={page.editing}
        name={page.name}
        orgType={page.orgType}
        creditCode={page.creditCode}
        phone={page.phone}
        location={page.location}
        systemRoleCodes={page.systemRoleCodes}
        tenantBindableRoles={page.tenantBindableRoles}
        adminUserId={page.adminUserId}
        adminUserOptions={page.adminUserOptions}
        enabled={page.enabled}
        fieldErrors={page.fieldErrors}
        sectionError={page.sectionError}
        onNameChange={page.setName}
        onOrgTypeChange={page.setOrgType}
        onCreditCodeChange={page.setCreditCode}
        onPhoneChange={page.setPhone}
        onLocationChange={page.setLocation}
        onAdminUserIdChange={page.setAdminUserId}
        onToggleSystemRole={page.toggleSystemRole}
        onEnabledChange={page.setEnabled}
        onClearFieldError={page.clearFieldError}
        onSubmit={page.handleSubmit}
      />

      <TableColumnSettingsSheet
        title="机构管理"
        open={page.orgTable.settingsOpen}
        onOpenChange={page.orgTable.setSettingsOpen}
        config={page.orgTable.config}
        defaultColumns={page.orgColumns}
        onUpdateColumn={page.orgTable.updateColumn}
        onReorder={page.orgTable.reorderColumns}
        onSetRowHeight={page.orgTable.setRowHeight}
        onResetColumn={page.orgTable.resetColumn}
        onResetAll={() => void page.orgTable.resetAll()}
      />

      <CredentialsDialog
        open={page.credentials != null}
        onOpenChange={(open) => {
          if (!open) page.setCredentials(null);
        }}
        title="机构与租户已开通"
        username={page.credentials?.username ?? ""}
        password={page.credentials?.password ?? ""}
      />
    </Page>
  );
}
