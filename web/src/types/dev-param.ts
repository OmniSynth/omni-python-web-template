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

export interface DevParamItemView {
  param_key: string;
  param_value: string;
  remark: string;
  updated_at: string | null;
  label: string;
  field_type: "input" | "password" | "readonly" | "role_multi_select";
  description: string;
  editable: boolean;
}

export interface DevParamGroupDetail extends DevParamGroupSummary {
  params: DevParamItemView[];
}
