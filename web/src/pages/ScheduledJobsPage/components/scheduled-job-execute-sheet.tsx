import { useEffect, useState } from "react";
import { FormField } from "@/components/form/form-field";
import { FormSectionError } from "@/components/form/form-section-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ScheduledJobRecord, ScheduledJobTenantOption } from "@/types/scheduled-job";

type ScheduledJobExecuteSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: ScheduledJobRecord | null;
  submitting: boolean;
  sectionError: string;
  onConfirm: (tenantId: number) => void;
  title?: string;
  confirmLabel?: string;
  /** 停止模式：额外提供「停止全局调度」 */
  onConfirmGlobal?: () => void;
  globalConfirmLabel?: string;
};

/** 租户选择抽屉：立即执行或按租户停止。 */
export function ScheduledJobExecuteSheet({
  open,
  onOpenChange,
  job,
  submitting,
  sectionError,
  onConfirm,
  title = "执行定时任务",
  confirmLabel = "确认执行",
  onConfirmGlobal,
  globalConfirmLabel = "停止全局调度",
}: ScheduledJobExecuteSheetProps) {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [items, setItems] = useState<ScheduledJobTenantOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword, open]);

  useEffect(() => {
    if (!open) {
      setKeyword("");
      setDebouncedKeyword("");
      setItems([]);
      setTotal(0);
      setSelectedId(null);
      setLoadError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    void api.scheduledJobs
      .tenantOptions({ q: debouncedKeyword, page: 1, page_size: 50 })
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setSelectedId((prev) => (prev != null && page.items.some((item) => item.id === prev) ? prev : null));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setLoadError(error instanceof Error ? error.message : "加载租户失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedKeyword, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {sectionError ? <FormSectionError>{sectionError}</FormSectionError> : null}
          <FormField label="任务">
            <div className="text-sm font-medium">{job?.name ?? "—"}</div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{job?.code ?? ""}</p>
          </FormField>
          <FormField label="选择租户" htmlFor="scheduled-job-tenant-q" required>
            <Input
              id="scheduled-job-tenant-q"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="手机号、名称、统一社会信用代码"
            />
          </FormField>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{loading ? "加载中…" : `共 ${total} 个租户`}</span>
              {selectedId != null ? <span>已选 1 个</span> : null}
            </div>
            {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
            {!loading && !loadError && items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">无匹配租户</p>
            ) : (
              <ul className="grid gap-2">
                {items.map((item) => {
                  const selected = selectedId === item.id;
                  const disabled = !item.enabled;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={disabled || submitting}
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-3 text-left transition",
                          selected ? "border-primary bg-accent" : "border-border bg-field hover:border-primary/30",
                          disabled && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium">{item.name}</span>
                          {!item.enabled ? <span className="text-xs text-muted-foreground">已禁用</span> : null}
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{item.code}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          手机号 {item.phone || "—"}
                          {item.org_name ? ` · ${item.org_name}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          统一社会信用代码 {item.org_credit_code || "—"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {onConfirmGlobal ? (
            <Button type="button" variant="outline" disabled={submitting || !job} onClick={() => onConfirmGlobal()}>
              {submitting ? "提交中…" : globalConfirmLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={submitting || selectedId == null || !job}
            onClick={() => {
              if (selectedId != null) onConfirm(selectedId);
            }}
          >
            {submitting ? "提交中…" : confirmLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
