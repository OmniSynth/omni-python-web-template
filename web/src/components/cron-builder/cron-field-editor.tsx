import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CRON_FIELD_MODE_OPTIONS,
  type CronFieldConfig,
  type CronFieldMeta,
  fieldStepOptions,
  fieldValueOptions,
} from "@/lib/cron-builder";
import { cn } from "@/lib/utils";

type CronFieldEditorProps = {
  meta: CronFieldMeta;
  value: CronFieldConfig;
  onChange: (next: CronFieldConfig) => void;
};

function patchField(field: CronFieldConfig, patch: Partial<CronFieldConfig>): CronFieldConfig {
  return { ...field, ...patch };
}

export function CronFieldEditor({ meta, value, onChange }: CronFieldEditorProps) {
  const valueOptions = fieldValueOptions(meta);
  const stepOptions = fieldStepOptions(meta);

  function setMode(mode: CronFieldConfig["mode"]) {
    const next = patchField(value, { mode });
    if (mode === "specific" && next.specific.length === 0) {
      next.specific = [meta.min];
    }
    if (mode === "range") {
      next.rangeStart = meta.min;
      next.rangeEnd = Math.min(meta.min + 1, meta.max);
    }
    if (mode === "step" && stepOptions.length > 0) {
      next.step = Number(stepOptions[0]?.value ?? 1);
    }
    onChange(next);
  }

  function toggleSpecific(optionValue: number, checked: boolean) {
    const next = new Set(value.specific);
    if (checked) {
      next.add(optionValue);
    } else {
      next.delete(optionValue);
    }
    onChange(patchField(value, { specific: [...next].sort((a, b) => a - b) }));
  }

  return (
    <div className="rounded border px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">{meta.label}</span>
        <div className="inline-flex rounded-md border p-0.5">
          {CRON_FIELD_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                value.mode === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {value.mode === "step" ? (
          <Select
            value={String(value.step)}
            options={stepOptions.length > 0 ? stepOptions : valueOptions}
            onValueChange={(next) => onChange(patchField(value, { step: Number(next) }))}
          >
            <SelectTrigger className="h-7 w-30 text-xs">
              <SelectValue placeholder="间隔" />
            </SelectTrigger>
            <SelectContent>
              {(stepOptions.length > 0 ? stepOptions : valueOptions).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {value.mode === "range" ? (
          <div className="flex items-center gap-1">
            <Select
              value={String(value.rangeStart)}
              options={valueOptions}
              onValueChange={(next) => onChange(patchField(value, { rangeStart: Number(next) }))}
            >
              <SelectTrigger className="h-7 w-18 text-xs">
                <SelectValue placeholder="起" />
              </SelectTrigger>
              <SelectContent>
                {valueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">—</span>
            <Select
              value={String(value.rangeEnd)}
              options={valueOptions}
              onValueChange={(next) => onChange(patchField(value, { rangeEnd: Number(next) }))}
            >
              <SelectTrigger className="h-7 w-18 text-xs">
                <SelectValue placeholder="止" />
              </SelectTrigger>
              <SelectContent>
                {valueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {value.mode === "any" ? <span className="text-xs text-muted-foreground">任意</span> : null}
      </div>

      {value.mode === "specific" ? (
        <ScrollArea className="mt-1.5 h-24 rounded border bg-background">
          <div className="grid grid-cols-6 gap-1 p-1.5 sm:grid-cols-8">
            {valueOptions.map((option) => {
              const optionValue = Number(option.value);
              const checked = value.specific.includes(optionValue);
              const id = `${meta.key}-${option.value}`;
              return (
                <Label key={option.value} htmlFor={id} className="flex items-center gap-1 text-xs font-normal">
                  <Checkbox
                    id={id}
                    className="size-3.5"
                    checked={checked}
                    onCheckedChange={(next) => toggleSpecific(optionValue, next === true)}
                  />
                  <span>{option.label}</span>
                </Label>
              );
            })}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      ) : null}
    </div>
  );
}
