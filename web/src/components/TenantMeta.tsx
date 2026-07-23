import { formatRegionAddress } from "@/lib/china-region";
import { cn } from "@/lib/utils";

export interface TenantMetaFields {
  tenant_code?: string;
  province?: string;
  city?: string;
  district?: string;
  org_name?: string;
  org_credit_code?: string;
  dept_name?: string | null;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-all text-foreground">{value}</dd>
    </div>
  );
}

export function TenantMetaList({ meta, className }: { meta: TenantMetaFields; className?: string }) {
  const region = formatRegionAddress(meta.province ?? "", meta.city ?? "", meta.district ?? "");
  return (
    <dl className={cn("grid gap-1.5", className)}>
      <MetaRow label="租户编码" value={meta.tenant_code ?? ""} />
      <MetaRow label="地区" value={region} />
      <MetaRow label="机构名称" value={meta.org_name ?? ""} />
      <MetaRow label="信用代码" value={meta.org_credit_code ?? ""} />
      <MetaRow label="部门" value={meta.dept_name ?? ""} />
    </dl>
  );
}
