import { CronFieldEditor } from "@/components/cron-builder/cron-field-editor";
import { FormField } from "@/components/form/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import {
  CRON_FIELD_META,
  type CronConfig,
  type CronCustomFields,
  type CronFieldKey,
  everyMinuteOptions,
  everySecondOptions,
  hourOptions,
  minuteOptions,
  weekdayOptions,
} from "@/lib/cron-builder";

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

type CronModePanelsProps = {
  config: CronConfig;
  onApply: (patch: Partial<CronConfig>) => void;
  onCustomField: (key: CronFieldKey, field: CronCustomFields[CronFieldKey]) => void;
};

export function CronModePanels({ config, onApply, onCustomField }: CronModePanelsProps) {
  return (
    <>
      <TabsContent value="every_n_seconds" className="mt-2">
        <IntervalSelect
          value={config.everyNSeconds}
          options={everySecondOptions()}
          onChange={(next) => onApply({ everyNSeconds: next })}
        />
      </TabsContent>

      <TabsContent value="every_n_minutes" className="mt-2">
        <IntervalSelect
          value={config.everyNMinutes}
          options={everyMinuteOptions()}
          onChange={(next) => onApply({ everyNMinutes: next })}
        />
      </TabsContent>

      <TabsContent value="hourly" className="mt-2">
        <FormField label="分钟">
          <Select
            value={String(config.hourlyMinute)}
            options={minuteOptions()}
            onValueChange={(next) => onApply({ hourlyMinute: Number(next) })}
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
            onValueChange={(next) => onApply({ dailyHour: Number(next) })}
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
            onValueChange={(next) => onApply({ dailyMinute: Number(next) })}
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
            onValueChange={(next) => onApply({ weeklyDay: Number(next) })}
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
              onValueChange={(next) => onApply({ weeklyHour: Number(next) })}
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
              onValueChange={(next) => onApply({ weeklyMinute: Number(next) })}
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
            onChange={(field) => onCustomField(meta.key, field)}
          />
        ))}
      </TabsContent>
    </>
  );
}
