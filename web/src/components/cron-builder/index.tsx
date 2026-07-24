import { useState } from "react";
import { CronFieldEditor } from "@/components/cron-builder/cron-field-editor";
import { FormField } from "@/components/form/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildCronExpr,
  CRON_FIELD_META,
  CRON_MODE_OPTIONS,
  type CronConfig,
  type CronCustomFields,
  type CronFieldKey,
  type CronMode,
  defaultCronConfig,
  describeCronExpr,
  everyMinuteOptions,
  everySecondOptions,
  hourOptions,
  minuteOptions,
  parseCronExpr,
  weekdayOptions,
} from "@/lib/cron-builder";

type CronBuilderProps = {
  value: string;
  onChange: (expr: string) => void;
};

type IntervalOption = { value: string; label: string };

function IntervalSelect({
  value,
  options,
  onChange,
}: {
  value: number;
  options: IntervalOption[];
  onChange: (next: number) => void;
}) {
  return (
    <FormField label="间隔">
      <Select value={String(value)} options={options} onValueChange={(next) => onChange(Number(next))}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="选择间隔" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

function readConfig(value: string, mode: CronMode): CronConfig {
  const parsed = parseCronExpr(value || buildCronExpr(defaultCronConfig()), {
    preferCustom: mode === "custom",
  });
  return { ...parsed, mode };
}

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [activeMode, setActiveMode] = useState<CronMode>(() => parseCronExpr(value).mode);
  const config = readConfig(value, activeMode);

  function apply(patch: Partial<CronConfig>) {
    const next = { ...readConfig(value, activeMode), ...patch, mode: activeMode };
    onChange(buildCronExpr(next));
  }

  function setMode(mode: CronMode) {
    setActiveMode(mode);
    const parsed = parseCronExpr(value || buildCronExpr(defaultCronConfig()), {
      preferCustom: mode === "custom",
    });
    onChange(buildCronExpr({ ...parsed, mode }));
  }

  function setCustomField(key: CronFieldKey, field: CronCustomFields[CronFieldKey]) {
    setActiveMode("custom");
    const parsed = parseCronExpr(value || buildCronExpr(defaultCronConfig()), { preferCustom: true });
    onChange(
      buildCronExpr({
        ...parsed,
        mode: "custom",
        customFields: {
          ...parsed.customFields,
          [key]: field,
        },
      }),
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={activeMode} onValueChange={(mode) => setMode(mode as CronMode)}>
        <TabsList className="inline-flex h-8 flex-wrap gap-0.5 p-0.5">
          {CRON_MODE_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="h-7 px-2.5 text-xs">
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="every_n_seconds" className="mt-2">
          <IntervalSelect
            value={config.everyNSeconds}
            options={everySecondOptions()}
            onChange={(next) => apply({ everyNSeconds: next })}
          />
        </TabsContent>

        <TabsContent value="every_n_minutes" className="mt-2">
          <IntervalSelect
            value={config.everyNMinutes}
            options={everyMinuteOptions()}
            onChange={(next) => apply({ everyNMinutes: next })}
          />
        </TabsContent>

        <TabsContent value="hourly" className="mt-2">
          <FormField label="分钟">
            <Select
              value={String(config.hourlyMinute)}
              options={minuteOptions()}
              onValueChange={(next) => apply({ hourlyMinute: Number(next) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="选择分钟" />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </TabsContent>

        <TabsContent value="daily" className="mt-2 grid grid-cols-2 gap-2">
          <FormField label="时">
            <Select
              value={String(config.dailyHour)}
              options={hourOptions()}
              onValueChange={(next) => apply({ dailyHour: Number(next) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="时" />
              </SelectTrigger>
              <SelectContent>
                {hourOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="分">
            <Select
              value={String(config.dailyMinute)}
              options={minuteOptions()}
              onValueChange={(next) => apply({ dailyMinute: Number(next) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="分" />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </TabsContent>

        <TabsContent value="weekly" className="mt-2 space-y-2">
          <FormField label="星期">
            <Select
              value={String(config.weeklyDay)}
              options={weekdayOptions()}
              onValueChange={(next) => apply({ weeklyDay: Number(next) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="星期" />
              </SelectTrigger>
              <SelectContent>
                {weekdayOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-2">
            <FormField label="时">
              <Select
                value={String(config.weeklyHour)}
                options={hourOptions()}
                onValueChange={(next) => apply({ weeklyHour: Number(next) })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="时" />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="分">
              <Select
                value={String(config.weeklyMinute)}
                options={minuteOptions()}
                onValueChange={(next) => apply({ weeklyMinute: Number(next) })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="分" />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-2 space-y-1.5">
          {CRON_FIELD_META.map((meta) => (
            <CronFieldEditor
              key={meta.key}
              meta={meta}
              value={config.customFields[meta.key]}
              onChange={(field) => setCustomField(meta.key, field)}
            />
          ))}
        </TabsContent>
      </Tabs>

      <div className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs">
        <div className="font-mono text-foreground">{value}</div>
        <div className="text-muted-foreground">
          {describeCronExpr(value, { preferCustom: activeMode === "custom" })}
        </div>
      </div>
    </div>
  );
}
