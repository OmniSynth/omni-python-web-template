import type { SubmitEvent } from "react";
import type { RegionSelection } from "@/lib/china-region";

export const ORG_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "company", label: "企业" },
  { value: "government", label: "政府" },
  { value: "school", label: "学校" },
  { value: "hospital", label: "医院" },
  { value: "association", label: "协会" },
];

export const EMPTY_REGION: RegionSelection = {
  province: "",
  city: "",
  district: "",
  region: "",
};

export interface RegisterFormValues {
  name: string;
  orgType: string;
  creditCode: string;
  phone: string;
  location: RegionSelection;
}

export interface RegisterFormPanelProps {
  values: RegisterFormValues;
  submitting: boolean;
  fieldErrors: Record<string, string>;
  onChange: <K extends keyof RegisterFormValues>(key: K, value: RegisterFormValues[K]) => void;
  onClearFieldError: (key: string) => void;
  onSubmit: (event: SubmitEvent) => void;
}
