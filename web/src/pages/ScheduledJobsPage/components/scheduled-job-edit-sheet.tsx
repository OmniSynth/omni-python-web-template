import { CronBuilder } from "@/components/cron-builder";
import { FormField } from "@/components/form/form-field";
import { FormSectionError } from "@/components/form/form-section-error";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ScheduledJobRecord } from "@/types/scheduled-job";

type ScheduledJobEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ScheduledJobRecord | null;
  cronExpr: string;
  onCronExprChange: (value: string) => void;
  sectionError: string;
  saving: boolean;
  onSave: () => void;
};

export function ScheduledJobEditSheet({
  open,
  onOpenChange,
  editing,
  cronExpr,
  onCronExprChange,
  sectionError,
  saving,
  onSave,
}: ScheduledJobEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>编辑定时任务</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {sectionError ? <FormSectionError>{sectionError}</FormSectionError> : null}
          <FormField label="任务名称">
            <div className="text-sm">{editing?.name ?? "—"}</div>
          </FormField>
          <FormField label="任务编码">
            <div className="font-mono text-sm">{editing?.code ?? "—"}</div>
          </FormField>
          <FormField label="说明">
            <div className="text-sm text-muted-foreground">{editing?.description || "—"}</div>
          </FormField>
          <FormField label="执行计划" required>
            <CronBuilder key={editing?.code ?? "none"} value={cronExpr} onChange={onCronExprChange} />
          </FormField>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={saving || !editing} onClick={onSave}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
