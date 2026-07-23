import type { SqlExplainResult } from "@/types/audit";

export interface ExplainMarkdownContext {
  occurredAt?: string;
  tierLabel?: string;
  severityLabel?: string;
  durationMs?: number;
  thresholdMs?: number;
  requestId?: string | null;
  httpMethod?: string | null;
  httpPath?: string | null;
  username?: string | null;
  userId?: number | null;
  sqlText?: string;
  sqlFingerprint?: string;
}

function mdCell(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function mdTable(headers: string[], rows: Record<string, unknown>[]): string {
  if (headers.length === 0 || rows.length === 0) return "";
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((h) => mdCell(row[h])).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

/** 将 EXPLAIN 结果格式化为 Markdown，便于粘贴到文档或 IM。 */
export function formatExplainMarkdown(explain: SqlExplainResult, context: ExplainMarkdownContext = {}): string {
  const lines: string[] = ["# 慢 SQL EXPLAIN", ""];

  if (context.occurredAt || context.tierLabel || context.durationMs != null) {
    lines.push("## 概要", "");
    if (context.occurredAt) lines.push(`- **时间**：${context.occurredAt}`);
    if (context.tierLabel || context.severityLabel) {
      lines.push(`- **Tier / 严重度**：${context.tierLabel ?? "—"} / ${context.severityLabel ?? "—"}`);
    }
    if (context.durationMs != null) {
      const timingParts = [`网络 ${context.durationMs}ms`];
      if (context.thresholdMs != null) {
        timingParts.push(`阈值 ${context.thresholdMs}ms`);
      }
      lines.push(`- **耗时**：${timingParts.join(" / ")}`);
    }
    if (context.requestId) lines.push(`- **Request ID**：\`${context.requestId}\``);
    if (context.httpMethod || context.httpPath) {
      lines.push(`- **HTTP**：${context.httpMethod ?? "—"} ${context.httpPath ?? ""}`.trim());
    }
    if (context.username || context.userId != null) {
      lines.push(`- **用户**：${context.username ?? "—"} (${context.userId ?? "—"})`);
    }
    if (context.sqlFingerprint) lines.push(`- **指纹**：\`${context.sqlFingerprint}\``);
    lines.push("");
  }

  if (context.sqlText) {
    lines.push("## SQL", "", "```sql", context.sqlText, "```", "");
  }

  if (explain.status === "skipped") {
    lines.push("## EXPLAIN", "", `> 已跳过：${explain.reason ?? "不适用"}`, "");
    return lines.join("\n");
  }

  if (explain.status === "error") {
    lines.push("## EXPLAIN", "", `> 执行失败：${explain.error ?? "未知错误"}`, "");
    return lines.join("\n");
  }

  const summary = explain.summary;
  if (summary) {
    lines.push("## 诊断摘要", "");
    lines.push(`- **扫描行数上限**：${summary.max_rows_examined ?? "—"}`);
    lines.push(`- **使用索引**：${summary.uses_index ? "是" : "否"}`);
    lines.push(`- **警告**：${summary.warnings.length > 0 ? summary.warnings.join("、") : "无"}`);
    lines.push("");
  }

  const plan = explain.plan ?? [];
  if (plan.length > 0) {
    const columns = Object.keys(plan[0]).filter((k) => plan[0][k] !== null && plan[0][k] !== undefined);
    lines.push("## 执行计划", "", mdTable(columns, plan), "");
  } else {
    lines.push("## 执行计划", "", "> 无执行计划行", "");
  }

  return lines.join("\n").trimEnd();
}

function plainCell(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value).replace(/\t/g, " ").replace(/\n/g, " ");
}

function plainTable(headers: string[], rows: Record<string, unknown>[]): string {
  if (headers.length === 0 || rows.length === 0) return "";
  return [headers.join("\t"), ...rows.map((row) => headers.map((h) => plainCell(row[h])).join("\t"))].join("\n");
}

/** 将 EXPLAIN 结果格式化为纯文本（无 Markdown 标记）。 */
export function formatExplainPlainText(explain: SqlExplainResult, context: ExplainMarkdownContext = {}): string {
  const lines: string[] = ["慢 SQL EXPLAIN", ""];

  if (context.occurredAt || context.tierLabel || context.durationMs != null) {
    lines.push("概要");
    if (context.occurredAt) lines.push(`时间：${context.occurredAt}`);
    if (context.tierLabel || context.severityLabel) {
      lines.push(`Tier / 严重度：${context.tierLabel ?? "—"} / ${context.severityLabel ?? "—"}`);
    }
    if (context.durationMs != null) {
      const timingParts = [`网络 ${context.durationMs}ms`];
      if (context.thresholdMs != null) {
        timingParts.push(`阈值 ${context.thresholdMs}ms`);
      }
      lines.push(`耗时：${timingParts.join(" / ")}`);
    }
    if (context.requestId) lines.push(`Request ID：${context.requestId}`);
    if (context.httpMethod || context.httpPath) {
      lines.push(`HTTP：${context.httpMethod ?? "—"} ${context.httpPath ?? ""}`.trim());
    }
    if (context.username || context.userId != null) {
      lines.push(`用户：${context.username ?? "—"} (${context.userId ?? "—"})`);
    }
    if (context.sqlFingerprint) lines.push(`指纹：${context.sqlFingerprint}`);
    lines.push("");
  }

  if (context.sqlText) {
    lines.push("SQL", context.sqlText, "");
  }

  if (explain.status === "skipped") {
    lines.push("EXPLAIN", `已跳过：${explain.reason ?? "不适用"}`, "");
    return lines.join("\n").trimEnd();
  }

  if (explain.status === "error") {
    lines.push("EXPLAIN", `执行失败：${explain.error ?? "未知错误"}`, "");
    return lines.join("\n").trimEnd();
  }

  const summary = explain.summary;
  if (summary) {
    lines.push("诊断摘要");
    lines.push(`扫描行数上限：${summary.max_rows_examined ?? "—"}`);
    lines.push(`使用索引：${summary.uses_index ? "是" : "否"}`);
    lines.push(`警告：${summary.warnings.length > 0 ? summary.warnings.join("、") : "无"}`, "");
  }

  const plan = explain.plan ?? [];
  if (plan.length > 0) {
    const columns = Object.keys(plan[0]).filter((k) => plan[0][k] !== null && plan[0][k] !== undefined);
    lines.push("执行计划", plainTable(columns, plan), "");
  } else {
    lines.push("执行计划", "无执行计划行", "");
  }

  return lines.join("\n").trimEnd();
}
