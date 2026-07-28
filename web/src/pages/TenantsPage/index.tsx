import { CredentialsDialog } from "@/components/CredentialsDialog";
import { Page, PageBody, PageHeader, PageMessage, TablePagination } from "@/components/layout/AppShell";
import { ConfigurableTable } from "@/components/table/ConfigurableTable";
import { TableColumnSettingsSheet } from "@/components/table/TableColumnSettingsSheet";
import { mobileClientInfiniteScroll, mobileTableProps } from "@/components/table/table-mobile-props";
import type { TenantRecord } from "@/types/auth";
import { TenantFormSheet } from "./components/tenant-form-sheet";
import { TenantsPageHeaderActions } from "./components/tenants-page-header-actions";
import { useTenantsPage } from "./hooks/use-tenants-page";

const MOBILE_TABLE = mobileTableProps<TenantRecord>({
  titleColumnId: "name",
  detailTitle: (tenant) => tenant.name,
});

export function TenantsPage() {
  const page = useTenantsPage();
  const pagination = page.tenantTable.pagination;

  return (
    <Page>
      <PageHeader title="租户管理" action={<TenantsPageHeaderActions page={page} />} />
      <PageBody layout="table">
        {page.pageLoadError ? <PageMessage variant="error">{page.pageLoadError}</PageMessage> : null}
        {page.orgs.length === 0 ? (
          <PageMessage variant="info">请先在机构管理中创建机构；推荐直接使用「新建机构」一键开通。</PageMessage>
        ) : null}
        <ConfigurableTable
          rows={pagination.items}
          columns={page.tenantTable.resolvedColumns}
          rowHeight={page.tenantTable.rowHeight}
          sort={page.tenantTable.sort}
          actionsColumnPref={page.tenantTable.config.columns.actions}
          rowKey={(t) => t.id}
          onSort={page.tenantTable.cycleSort}
          onColumnWidthsChange={page.tenantTable.setColumnWidths}
          emptyMessage="暂无租户"
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

      <TenantFormSheet
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
        orgs={page.orgs}
        selectedOrg={page.selectedOrg}
        orgId={page.orgId}
        name={page.name}
        setName={page.setName}
        phone={page.phone}
        setPhone={page.setPhone}
        location={page.location}
        setLocation={page.setLocation}
        adminUserId={page.adminUserId}
        setAdminUserId={page.setAdminUserId}
        adminUserOptions={page.adminUserOptions}
        systemRoleCodes={page.systemRoleCodes}
        tenantBindableRoles={page.tenantBindableRoles}
        enabled={page.enabled}
        setEnabled={page.setEnabled}
        fieldErrors={page.fieldErrors}
        clearFieldError={page.clearFieldError}
        sectionError={page.sectionError}
        onOrgChange={page.handleOrgChange}
        onToggleSystemRole={page.toggleSystemRole}
        onSubmit={page.handleSubmit}
      />

      <TableColumnSettingsSheet
        title="租户管理"
        open={page.tenantTable.settingsOpen}
        onOpenChange={page.tenantTable.setSettingsOpen}
        config={page.tenantTable.config}
        defaultColumns={page.tenantColumns}
        onUpdateColumn={page.tenantTable.updateColumn}
        onReorder={page.tenantTable.reorderColumns}
        onSetRowHeight={page.tenantTable.setRowHeight}
        onResetColumn={page.tenantTable.resetColumn}
        onResetAll={() => void page.tenantTable.resetAll()}
      />

      <CredentialsDialog
        open={page.credentials != null}
        onOpenChange={(open) => {
          if (!open) page.setCredentials(null);
        }}
        title="租户已开通"
        username={page.credentials?.username ?? ""}
        password={page.credentials?.password ?? ""}
        siteName={page.credentials?.site_name}
      />
    </Page>
  );
}
