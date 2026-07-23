import { useMemo, useRef } from "react";
import {
  ExplainPlanCopySources,
  ExplainPlanHeader,
  explainSkipReasonLabel,
} from "@/components/audit/explain-plan-parts";
import { ExplainPlanSummary, ExplainPlanTable } from "@/components/audit/explain-plan-table";
import { type ExplainMarkdownContext, formatExplainMarkdown, formatExplainPlainText } from "@/lib/explain-markdown";
import type { SlowSqlLogRecord, SqlExplainResult } from "@/types/audit";

export function parseExplain(meta: SlowSqlLogRecord["meta_json"]): SqlExplainResult | null {
  return meta?.explain ?? null;
}

interface ExplainPlanBlockProps {
  explain: SqlExplainResult | null;
  context?: ExplainMarkdownContext;
}

/** 慢 SQL 详情抽屉内的 EXPLAIN 计划展示（按需懒加载）。 */
export function ExplainPlanBlock({ explain, context }: ExplainPlanBlockProps) {
  const plainCopyRef = useRef<HTMLTextAreaElement>(null);
  const markdownCopyRef = useRef<HTMLTextAreaElement>(null);
  const plainText = useMemo(() => (explain ? formatExplainPlainText(explain, context) : ""), [explain, context]);
  const markdown = useMemo(() => (explain ? formatExplainMarkdown(explain, context) : ""), [explain, context]);

  if (!explain) {
    return (
      <div className="grid gap-1">
        <p className="text-muted-foreground">EXPLAIN 分析</p>
        <p className="text-muted-foreground text-xs">未执行 EXPLAIN（可能已关闭自动分析）</p>
      </div>
    );
  }

  const header = (
    <ExplainPlanHeader
      plainText={plainText}
      markdown={markdown}
      plainCopyRef={plainCopyRef}
      markdownCopyRef={markdownCopyRef}
    />
  );

  if (explain.status === "skipped") {
    return (
      <div className="grid gap-1">
        <ExplainPlanCopySources
          plainText={plainText}
          markdown={markdown}
          plainCopyRef={plainCopyRef}
          markdownCopyRef={markdownCopyRef}
        />
        {header}
        <p className="text-muted-foreground text-xs">已跳过：{explainSkipReasonLabel(explain.reason)}</p>
      </div>
    );
  }

  if (explain.status === "error") {
    return (
      <div className="grid gap-1">
        <ExplainPlanCopySources
          plainText={plainText}
          markdown={markdown}
          plainCopyRef={plainCopyRef}
          markdownCopyRef={markdownCopyRef}
        />
        {header}
        <p className="text-destructive text-xs">{explain.error ?? "EXPLAIN 执行失败"}</p>
      </div>
    );
  }

  const plan = explain.plan ?? [];
  const summary = explain.summary;

  return (
    <div className="grid gap-2">
      <ExplainPlanCopySources
        plainText={plainText}
        markdown={markdown}
        plainCopyRef={plainCopyRef}
        markdownCopyRef={markdownCopyRef}
      />
      {header}
      {summary ? <ExplainPlanSummary summary={summary} /> : null}
      <ExplainPlanTable plan={plan} />
    </div>
  );
}
