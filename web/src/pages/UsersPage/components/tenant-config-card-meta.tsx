import { TenantMetaList } from "@/components/TenantMeta";
import type { UserTenantConfigItem } from "@/types/auth";

export function TenantConfigCardMeta({ item }: { item: UserTenantConfigItem }) {
  return (
    <TenantMetaList
      className="mt-1"
      meta={{
        tenant_code: item.tenant_code,
        province: item.province,
        city: item.city,
        district: item.district,
        org_name: item.org_name,
        org_credit_code: item.org_credit_code,
      }}
    />
  );
}
