import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTimezone } from "@/contexts/TimezoneContext";
import { api } from "@/lib/api";
import type { ScheduledJobRunsQuery } from "@/lib/api/scheduled-jobs";
import type { ScheduledJobRunRecord } from "@/types/scheduled-job";
import { SCHEDULED_JOB_STATUS_LABELS, SCHEDULED_JOB_TRIGGER_LABELS } from "@/types/scheduled-job";
import { ScheduledJobRunJsonBlock } from "./json-block";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "destructive"> = {
  success: "success",
  failure: "destructive",
  running: "default",
  partial: "secondary",
  skipped: "secondary",
};

type Scope = "platform" | "tenant";

type ScheduledJobRunsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobCode: string | null;
  jobName?: string;
  scope: Scope;
  showTenantId?: boolean;
};

export function ScheduledJobRunsSheet({
  open,
  onOpenChange,
  jobCode,
  jobName,
  scope,
  showTenantId = false,
}: ScheduledJobRunsSheetProps) {
  const { formatDateTime } = useTimezone();
  const [items, setItems] = useState<ScheduledJobRunRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ScheduledJobRunRecord | null>(null);

  const load = useCallback(
    async (nextPage: number) => {
      if (!jobCode) return;
      setLoading(true);
      setError("");
      try {
        const query: ScheduledJobRunsQuery = { page: nextPage, page_size: 20 };
        const result =
          scope === "platform"
            ? await api.scheduledJobs.listRuns(jobCode, query)
            : await api.scheduledJobs.listTenantRuns(jobCode, query);
        setItems(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载执行记录失败");
      } finally {
        setLoading(false);
      }
    },
    [jobCode, scope],
  );

  useEffect(() => {
    if (!open || !jobCode) {
      setItems([]);
      setTotal(0);
      setPage(1);
      setDetail(null);
      setError("");
      return;
    }
    void load(1);
  }, [open, jobCode, load]);

  const openDetail = async (run: ScheduledJobRunRecord) => {
    try {
      const full =
        scope === "platform"
          ? await api.scheduledJobs.getRun(run.run_id)
          : await api.scheduledJobs.getTenantRun(run.run_id);
      setDetail(full);
    } catch {
      setDetail(run);
    }
  };

  const title = jobName ? `${jobName} · 执行记录` : "执行记录";
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail ? "执行详情" : title}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {detail ? (
            <RunDetail
              detail={detail}
              formatDateTime={formatDateTime}
              showTenantId={showTenantId}
              onBack={() => setDetail(null)}
            />
          ) : (
            <div className="grid gap-3">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {loading ? <p className="text-sm text-muted-foreground">加载中…</p> : null}
              {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">暂无执行记录</p> : null}
              <ScrollArea className="max-h-[min(70vh,36rem)]">
                <ul className="grid gap-2 pr-3">
                  {items.map((run) => (
                    <li key={run.run_id}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-border/60 bg-transparent px-3 py-2 text-left hover:bg-muted/40"
                        onClick={() => void openDetail(run)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={STATUS_VARIANT[run.status] ?? "secondary"}>
                            {SCHEDULED_JOB_STATUS_LABELS[run.status] ?? run.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {SCHEDULED_JOB_TRIGGER_LABELS[run.trigger_type]}
                            {run.duration_ms != null ? ` · ${run.duration_ms}ms` : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(run.started_at)}</p>
                        <p className="mt-1 line-clamp-2 text-sm">{run.summary || "—"}</p>
                        {showTenantId && run.tenant_id != null ? (
                          <p className="mt-1 text-xs text-muted-foreground">租户 #{run.tenant_id}</p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              {total > 20 ? (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => void load(page - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page} / {totalPages}（共 {total}）
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => void load(page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function RunDetail({
  detail,
  formatDateTime,
  showTenantId,
  onBack,
}: {
  detail: ScheduledJobRunRecord;
  formatDateTime: (value: string) => string;
  showTenantId: boolean;
  onBack: () => void;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <Button type="button" variant="ghost" size="sm" className="w-fit px-0" onClick={onBack}>
        ← 返回列表
      </Button>
      <p>
        <span className="text-muted-foreground">Run ID：</span>
        <span className="font-mono text-xs">{detail.run_id}</span>
      </p>
      <p>
        <span className="text-muted-foreground">状态：</span>
        <Badge variant={STATUS_VARIANT[detail.status] ?? "secondary"}>
          {SCHEDULED_JOB_STATUS_LABELS[detail.status] ?? detail.status}
        </Badge>
      </p>
      <p>
        <span className="text-muted-foreground">触发：</span>
        {SCHEDULED_JOB_TRIGGER_LABELS[detail.trigger_type]}
        {detail.actor_username ? ` · ${detail.actor_username}` : ""}
      </p>
      {showTenantId && detail.tenant_id != null ? (
        <p>
          <span className="text-muted-foreground">租户：</span>#{detail.tenant_id}
        </p>
      ) : null}
      <p>
        <span className="text-muted-foreground">开始：</span>
        {formatDateTime(detail.started_at)}
      </p>
      <p>
        <span className="text-muted-foreground">结束：</span>
        {detail.finished_at ? formatDateTime(detail.finished_at) : "—"}
        {detail.duration_ms != null ? `（${detail.duration_ms}ms）` : ""}
      </p>
      {detail.trigger_request_id ? (
        <p>
          <span className="text-muted-foreground">Request ID：</span>
          <span className="font-mono text-xs">{detail.trigger_request_id}</span>
        </p>
      ) : null}
      <p>
        <span className="text-muted-foreground">摘要：</span>
        {detail.summary || "—"}
      </p>
      {detail.error_text ? <p className="text-destructive whitespace-pre-wrap">{detail.error_text}</p> : null}
      <div>
        <p className="mb-1 text-muted-foreground">入参</p>
        <ScheduledJobRunJsonBlock data={detail.params_json} />
      </div>
      <div>
        <p className="mb-1 text-muted-foreground">环境</p>
        <ScheduledJobRunJsonBlock data={detail.context_json} />
      </div>
      <div>
        <p className="mb-1 text-muted-foreground">结果关节</p>
        <ScheduledJobRunJsonBlock data={detail.result_json} />
      </div>
    </div>
  );
}
