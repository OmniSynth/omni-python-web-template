import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DevParamItemView, DevParamSelectOption } from "@/types/dev-param";

const compactInputClass = "h-9 rounded-lg px-2.5 py-1 text-sm shadow-none hover:bg-muted/65 focus-visible:ring-2";

export function DevParamValueField({
  fieldType,
  value,
  onChange,
  htmlId,
  compact = false,
  configured = false,
  selectOptions = [],
  placeholder = "",
  readOnly = false,
}: {
  fieldType: DevParamItemView["field_type"];
  value: string;
  onChange: (value: string) => void;
  htmlId?: string;
  compact?: boolean;
  configured?: boolean;
  selectOptions?: DevParamSelectOption[];
  placeholder?: string;
  readOnly?: boolean;
}) {
  if (fieldType === "readonly" || readOnly) {
    return <Input id={htmlId} value={value} readOnly className={compact ? compactInputClass : undefined} />;
  }
  if (fieldType === "select") {
    const options = selectOptions.map((item) => ({ value: item.value, label: item.label }));
    return (
      <Select value={value || undefined} onValueChange={onChange} options={options}>
        <SelectTrigger id={htmlId} className={cn("w-full", compact && "h-9")}>
          <SelectValue placeholder={placeholder || "请选择"} />
        </SelectTrigger>
        <SelectContent>
          {selectOptions.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const inputPlaceholder = fieldType === "password" && configured ? "已配置，留空保持不变" : placeholder || undefined;

  return (
    <Input
      id={htmlId}
      type={fieldType === "password" ? "password" : "text"}
      value={value}
      placeholder={inputPlaceholder}
      onChange={(e) => onChange(e.target.value)}
      className={compact ? compactInputClass : undefined}
    />
  );
}
