import type { PermissionRecord } from "@/types/auth";

export const KIND_LABEL: Record<string, string> = {
  catalog: "目录",
  menu: "菜单",
  button: "按钮",
  api: "接口",
};

export interface EditableNameFieldProps {
  record: PermissionRecord;
  editing: boolean;
  draftName: string;
  nameFocused: boolean;
  canUpdate: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  titleClassName?: string;
  onStartEdit: () => void;
  onDraftChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onCancel: () => void;
  onSave: () => void;
}
