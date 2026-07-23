import { useClientTable } from "@/hooks/useClientTable";
import type { TenantRecord } from "@/types/auth";
import { useTenantColumns } from "./use-tenant-columns";

export function useTenantsPageTable({
  tenants,
  openEdit,
}: {
  tenants: TenantRecord[];
  openEdit: (tenant: TenantRecord) => Promise<void>;
}) {
  const tenantColumns = useTenantColumns(openEdit);
  const tenantTable = useClientTable({
    pageKey: "tenants",
    tableKey: "main",
    rows: tenants,
    defaultColumns: tenantColumns,
  });
  return { tenantColumns, tenantTable };
}
