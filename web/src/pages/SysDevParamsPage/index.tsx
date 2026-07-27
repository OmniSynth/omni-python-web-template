import { sysDevParamsApi } from "@/lib/api/sys-dev-params";
import { DevParamsPage } from "@/pages/DevParamsPage";

export function SysDevParamsPage() {
  return (
    <DevParamsPage
      client={sysDevParamsApi}
      pageKey="sys_dev_params"
      pageTitle="系统开发参数"
      listPermission="system.dev_param.list"
      updatePermission="system.dev_param.update"
    />
  );
}
