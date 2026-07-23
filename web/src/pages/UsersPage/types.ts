export type SheetMode = "create" | "edit";

export type TenantDraft = {
  bound: boolean;
  dept_id: number | null;
  data_scope: number;
  custom_scope_dept_ids: number[];
};

export type PasswordReveal = {
  username: string;
  password: string;
  kind: "create" | "reset";
};
