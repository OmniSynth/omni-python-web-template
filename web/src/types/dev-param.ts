export interface DevParamGroupSummary {
  id: number;
  name: string;
  description: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_by_name: string;
  updated_by_name: string;
  param_count: number;
}

export interface DevParamSelectOption {
  value: string;
  label: string;
}

export interface DevParamItemView {
  param_key: string;
  param_value: string;
  remark: string;
  updated_at: string | null;
  label: string;
  field_type: "input" | "password" | "readonly" | "role_multi_select" | "select";
  description: string;
  placeholder: string;
  editable: boolean;
  configured: boolean;
  select_options: DevParamSelectOption[];
}

export interface DevParamGroupDetail extends DevParamGroupSummary {
  params: DevParamItemView[];
}

export type DevParamsClient = {
  groups: () => Promise<DevParamGroupSummary[]>;
  getGroup: (groupId: number) => Promise<DevParamGroupDetail>;
  updateGroup: (groupId: number, body: { name: string; description?: string }) => Promise<DevParamGroupSummary>;
  update: (paramKey: string, body: { param_value: string; remark?: string }) => Promise<unknown>;
};
