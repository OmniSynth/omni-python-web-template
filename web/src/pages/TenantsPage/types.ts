import type { RegionSelection } from "@/lib/china-region";

export const ADMIN_AUTO = "__auto__";

export const ORG_TYPE_LABELS: Record<string, string> = {
  company: "企业",
  government: "政府",
  school: "学校",
  hospital: "医院",
  association: "协会",
};

export const INDUSTRY_PREFIX: Record<string, string> = {
  company: "co",
  government: "gv",
  school: "sc",
  hospital: "hp",
  association: "as",
};

export const EMPTY_REGION: RegionSelection = {
  province: "",
  city: "",
  district: "",
  region: "",
};
