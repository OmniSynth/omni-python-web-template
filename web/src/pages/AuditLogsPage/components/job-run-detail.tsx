import type { ScheduledJobRunRecord } from "@/types/scheduled-job";
import { SCHEDULED_JOB_STATUS_LABELS, SCHEDULED_JOB_TRIGGER_LABELS } from "@/types/scheduled-job";
import { JsonBlock } from "./json-block";

export function JobRunDetail({
  detail,
  formatDateTime,
}: {
  detail: ScheduledJobRunRecord;
  formatDateTime: (value: string) => string;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <p>
        <span className="text-muted-foreground">Run ID：</span>
        <span className="font-mono text-xs">{detail.run_id}</span>
      </p>
      <p>
        <span className="text-muted-foreground">任务：</span>
        <span className="font-mono text-xs">{detail.job_code}</span>
      </p>
      <p>
        <span className="text-muted-foreground">状态：</span>
        {SCHEDULED_JOB_STATUS_LABELS[detail.status] ?? detail.status}
      </p>
      <p>
        <span className="text-muted-foreground">触发：</span>
        {SCHEDULED_JOB_TRIGGER_LABELS[detail.trigger_type]}
        {detail.actor_username ? ` · ${detail.actor_username}` : ""}
      </p>
      <p>
        <span className="text-muted-foreground">租户：</span>
        {detail.tenant_id != null ? `#${detail.tenant_id}` : "—"}
      </p>
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
      {detail.error_text ? <p className="whitespace-pre-wrap text-destructive">{detail.error_text}</p> : null}
      <div>
        <p className="mb-1 text-muted-foreground">入参</p>
        <JsonBlock data={detail.params_json} />
      </div>
      <div>
        <p className="mb-1 text-muted-foreground">环境</p>
        <JsonBlock data={detail.context_json} />
      </div>
      <div>
        <p className="mb-1 text-muted-foreground">结果关节</p>
        <JsonBlock data={detail.result_json} />
      </div>
    </div>
  );
}
