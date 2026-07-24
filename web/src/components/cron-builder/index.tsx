import { useEffect, useRef, useState } from "react";
import { CronModePanels } from "@/components/cron-builder/cron-mode-panels";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildCronExpr,
  CRON_MODE_OPTIONS,
  type CronConfig,
  type CronCustomFields,
  type CronFieldKey,
  type CronMode,
  defaultCronConfig,
  describeCronExpr,
  parseCronExpr,
} from "@/lib/cron-builder";

type CronBuilderProps = {
  value: string;
  onChange: (expr: string) => void;
};

function readConfig(value: string, mode: CronMode): CronConfig {
  const parsed = parseCronExpr(value || buildCronExpr(defaultCronConfig()), {
    preferCustom: mode === "custom",
  });
  return { ...parsed, mode };
}

function emitExpr(onChange: (expr: string) => void, lastEmitted: { current: string }, next: string) {
  lastEmitted.current = next;
  onChange(next);
}

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [activeMode, setActiveMode] = useState<CronMode>(() => parseCronExpr(value).mode);
  const lastEmitted = useRef(value);
  const config = readConfig(value, activeMode);

  // 外部回填（打开编辑）时按表达式纠正 Tab，避免仍停在「秒/小时」等错误模式
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setActiveMode(parseCronExpr(value).mode);
  }, [value]);

  function apply(patch: Partial<CronConfig>) {
    const next = { ...readConfig(value, activeMode), ...patch, mode: activeMode };
    emitExpr(onChange, lastEmitted, buildCronExpr(next));
  }

  function setMode(mode: CronMode) {
    setActiveMode(mode);
    const parsed = parseCronExpr(value || buildCronExpr(defaultCronConfig()), {
      preferCustom: mode === "custom",
    });
    emitExpr(onChange, lastEmitted, buildCronExpr({ ...parsed, mode }));
  }

  function setCustomField(key: CronFieldKey, field: CronCustomFields[CronFieldKey]) {
    setActiveMode("custom");
    const parsed = parseCronExpr(value || buildCronExpr(defaultCronConfig()), { preferCustom: true });
    emitExpr(
      onChange,
      lastEmitted,
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
      <Tabs
        value={activeMode}
        onValueChange={(mode, details) => {
          // 忽略 Tabs 自动回退/初次选中，防止把「每 N 分钟」改写成秒级 6 段表达式
          if (details.reason !== "none") return;
          setMode(mode as CronMode);
        }}
      >
        <TabsList className="inline-flex h-8 flex-wrap gap-0.5 p-0.5">
          {CRON_MODE_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="h-7 px-2.5 text-xs">
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <CronModePanels config={config} onApply={apply} onCustomField={setCustomField} />
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
