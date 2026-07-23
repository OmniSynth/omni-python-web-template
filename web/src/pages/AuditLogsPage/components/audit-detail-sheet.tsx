import { Copy } from "lucide-react";
import { lazy, Suspense, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { copyToClipboard } from "@/lib/clipboard";
import { showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { OperationLogRecord, RequestLogRecord, SlowSqlLogRecord } from "@/types/audit";
import { SEVERITY_LABEL, TIER_LABEL } from "../types";
import { JsonBlock } from "./json-block";

const ExplainPlanBlock = lazy(() =>
  import("@/components/audit/ExplainPlanBlock").then((mod) => ({
    default: mod.ExplainPlanBlock,
  })),
);

type AuditDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatDateTime: (value: string) => string;
  requestDetail: RequestLogRecord | null;
  operationDetail: OperationLogRecord | null;
  slowSqlDetail: SlowSqlLogRecord | null;
};

async function copySqlText(text: string, source: HTMLTextAreaElement | null) {
  if (!text) return;
  const ok = await copyToClipboard(text, source);
  if (ok) showToastSuccess("已复制 SQL");
  else {
    source?.focus();
    source?.select();
    showToastError("复制失败，内容已选中，请按 Ctrl+C / ⌘+C");
  }
}

export function AuditDetailSheet({
  open,
  onOpenChange,
  formatDateTime,
  requestDetail,
  operationDetail,
  slowSqlDetail,
}: AuditDetailSheetProps) {
  const sqlCopyRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={slowSqlDetail ? "p-0 sm:max-w-[min(96vw,72rem)] xl:max-w-[min(84vw,80rem)]" : "p-0 sm:max-w-xl"}
      >
        <SheetHeader>
          <SheetTitle>{requestDetail ? "请求日志详情" : operationDetail ? "操作日志详情" : "慢 SQL 详情"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {requestDetail ? (
            <div className="grid gap-3 text-sm">
              <p>
                <span className="text-muted-foreground">Request ID：</span>
                <span className="font-mono text-xs">{requestDetail.request_id}</span>
              </p>
              <p>
                <span className="text-muted-foreground">时间：</span>
                {formatDateTime(requestDetail.occurred_at)}
              </p>
              <p>
                <span className="text-muted-foreground">请求：</span>
                {requestDetail.method} {requestDetail.path}
              </p>
              <p>
                <span className="text-muted-foreground">状态：</span>
                {requestDetail.status_code} / {requestDetail.auth_status}
              </p>
              <p>
                <span className="text-muted-foreground">用户：</span>
                {requestDetail.username ?? "—"} ({requestDetail.user_id ?? "—"})
              </p>
              <p>
                <span className="text-muted-foreground">IP：</span>
                {requestDetail.client_ip ?? "—"}
              </p>
              {requestDetail.permission_code ? (
                <p>
                  <span className="text-muted-foreground">权限码：</span>
                  {requestDetail.permission_code}
                </p>
              ) : null}
              {requestDetail.error_detail ? <p className="text-destructive">{requestDetail.error_detail}</p> : null}
            </div>
          ) : null}
          {operationDetail ? (
            <div className="grid gap-3 text-sm">
              <p>{operationDetail.summary}</p>
              <p>
                <span className="text-muted-foreground">Request ID：</span>
                {operationDetail.request_id ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">操作人：</span>
                {operationDetail.actor_username ?? "—"}
              </p>
              <div>
                <p className="mb-1 text-muted-foreground">变更前</p>
                <JsonBlock data={operationDetail.before_json} />
              </div>
              <div>
                <p className="mb-1 text-muted-foreground">变更后</p>
                <JsonBlock data={operationDetail.after_json} />
              </div>
            </div>
          ) : null}
          {slowSqlDetail ? (
            <div className="grid gap-3 pb-2 text-sm">
              <p>
                <span className="text-muted-foreground">时间：</span>
                {formatDateTime(slowSqlDetail.occurred_at)}
              </p>
              <p>
                <span className="text-muted-foreground">Tier / 严重度：</span>
                {TIER_LABEL[slowSqlDetail.tier]} / {SEVERITY_LABEL[slowSqlDetail.severity]}
              </p>
              <p>
                <span className="text-muted-foreground">耗时：</span>
                网络 {slowSqlDetail.duration_ms}ms · 阈值 {slowSqlDetail.threshold_ms}ms
              </p>
              <p>
                <span className="text-muted-foreground">Request ID：</span>
                <span className="font-mono text-xs">{slowSqlDetail.request_id ?? "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">HTTP：</span>
                {slowSqlDetail.http_method ?? "—"} {slowSqlDetail.http_path ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">用户：</span>
                {slowSqlDetail.username ?? "—"} ({slowSqlDetail.user_id ?? "—"})
              </p>
              <p>
                <span className="text-muted-foreground">指纹：</span>
                <span className="font-mono text-xs">{slowSqlDetail.sql_fingerprint}</span>
              </p>
              {slowSqlDetail.rows_affected != null ? (
                <p>
                  <span className="text-muted-foreground">影响行数：</span>
                  {slowSqlDetail.rows_affected}
                </p>
              ) : null}
              <div>
                <textarea
                  ref={sqlCopyRef}
                  aria-hidden
                  tabIndex={-1}
                  readOnly
                  value={slowSqlDetail.sql_text}
                  className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                />
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground">SQL</p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 min-h-7 w-7 min-w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                    title="复制 SQL"
                    aria-label="复制 SQL"
                    onClick={() => void copySqlText(slowSqlDetail.sql_text, sqlCopyRef.current)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
                <ScrollArea className="max-h-48 rounded-md bg-muted/50 p-2">
                  <pre className="text-xs whitespace-pre-wrap">{slowSqlDetail.sql_text}</pre>
                </ScrollArea>
              </div>
              <Suspense fallback={<p className="text-muted-foreground text-xs">加载 EXPLAIN…</p>}>
                <ExplainPlanBlock
                  explain={slowSqlDetail.meta_json?.explain ?? null}
                  context={{
                    occurredAt: formatDateTime(slowSqlDetail.occurred_at),
                    tierLabel: TIER_LABEL[slowSqlDetail.tier],
                    severityLabel: SEVERITY_LABEL[slowSqlDetail.severity],
                    durationMs: slowSqlDetail.duration_ms,
                    thresholdMs: slowSqlDetail.threshold_ms,
                    requestId: slowSqlDetail.request_id,
                    httpMethod: slowSqlDetail.http_method,
                    httpPath: slowSqlDetail.http_path,
                    username: slowSqlDetail.username,
                    userId: slowSqlDetail.user_id,
                    sqlText: slowSqlDetail.sql_text,
                    sqlFingerprint: slowSqlDetail.sql_fingerprint,
                  }}
                />
              </Suspense>
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
