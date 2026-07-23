import { Can } from "@/components/Can";
import { TableSettingsButton } from "@/components/table/TableSettingsButton";
import { TableHeaderActions } from "@/components/table/table-header-actions";
import { TableHeaderButton } from "@/components/table/table-header-button";
import type { useTenantsPage } from "../hooks/use-tenants-page";

type TenantsPageState = ReturnType<typeof useTenantsPage>;

export function TenantsPageHeaderActions({ page }: { page: TenantsPageState }) {
  return (
    <TableHeaderActions
      settings={<TableSettingsButton title="租户管理" onClick={() => page.tenantTable.setSettingsOpen(true)} />}
      mobileLayoutToggle
    >
      <Can permission="system.tenant.create">
        <TableHeaderButton
          type="button"
          mobileLabel="新建"
          disabled={page.orgs.length === 0}
          onClick={() => void page.openCreate()}
        >
          新建租户
        </TableHeaderButton>
      </Can>
    </TableHeaderActions>
  );
}
