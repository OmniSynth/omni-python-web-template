import { Input } from "@/components/ui/input";
import type { DevParamItemView } from "@/types/dev-param";

const compactInputClass = "h-9 rounded-lg px-2.5 py-1 text-sm shadow-none hover:bg-muted/65 focus-visible:ring-2";

export function DevParamValueField({
  fieldType,
  value,
  onChange,
  htmlId,
  compact = false,
}: {
  fieldType: DevParamItemView["field_type"];
  value: string;
  onChange: (value: string) => void;
  htmlId?: string;
  compact?: boolean;
}) {
  if (fieldType === "readonly") {
    return <Input id={htmlId} value={value} readOnly className={compact ? compactInputClass : undefined} />;
  }
  return (
    <Input
      id={htmlId}
      type={fieldType === "password" ? "password" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={compact ? compactInputClass : undefined}
    />
  );
}
