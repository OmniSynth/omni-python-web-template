import { json } from "@/lib/api/client";
import type { DevParamGroupDetail, DevParamGroupSummary } from "@/types/dev-param";

export const devParamsApi = {
  groups: () => json<DevParamGroupSummary[]>("/api/v1/dev-params/groups"),
  getGroup: (groupId: number) => json<DevParamGroupDetail>(`/api/v1/dev-params/groups/${groupId}`),
  updateGroup: (groupId: number, body: { name: string; description?: string }) =>
    json<DevParamGroupSummary>(`/api/v1/dev-params/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  update: (paramKey: string, body: { param_value: string; remark?: string }) =>
    json<{ param_key: string; param_value: string; remark: string }>(
      `/api/v1/dev-params/${encodeURIComponent(paramKey)}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
};
