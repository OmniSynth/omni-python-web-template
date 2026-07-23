import { Copy, FileCode2 } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { showToastError, showToastSuccess } from "@/lib/form-feedback";

export async function copyExplainText(text: string, source: HTMLTextAreaElement | null, label: string) {
  if (!text) return;
  const ok = await copyToClipboard(text, source);
  if (ok) showToastSuccess(`已复制${label}`);
  else {
    source?.focus();
    source?.select();
    showToastError("复制失败，内容已选中，请按 Ctrl+C / ⌘+C");
  }
}

interface ExplainPlanCopySourcesProps {
  plainText: string;
  markdown: string;
  plainCopyRef: RefObject<HTMLTextAreaElement | null>;
  markdownCopyRef: RefObject<HTMLTextAreaElement | null>;
}

export function ExplainPlanCopySources({
  plainText,
  markdown,
  plainCopyRef,
  markdownCopyRef,
}: ExplainPlanCopySourcesProps) {
  if (!plainText && !markdown) return null;
  return (
    <>
      <textarea
        ref={plainCopyRef}
        aria-hidden
        tabIndex={-1}
        readOnly
        value={plainText}
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      />
      <textarea
        ref={markdownCopyRef}
        aria-hidden
        tabIndex={-1}
        readOnly
        value={markdown}
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      />
    </>
  );
}

interface ExplainPlanHeaderProps {
  plainText: string;
  markdown: string;
  plainCopyRef: RefObject<HTMLTextAreaElement | null>;
  markdownCopyRef: RefObject<HTMLTextAreaElement | null>;
}

export function ExplainPlanHeader({ plainText, markdown, plainCopyRef, markdownCopyRef }: ExplainPlanHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground">EXPLAIN 分析</p>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          className="h-7 min-h-7 w-7 min-w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          title="复制纯文本"
          aria-label="复制 EXPLAIN 纯文本"
          onClick={() => void copyExplainText(plainText, plainCopyRef.current, "纯文本")}
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-7 min-h-7 w-7 min-w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
          title="复制 Markdown"
          aria-label="复制 EXPLAIN Markdown"
          onClick={() => void copyExplainText(markdown, markdownCopyRef.current, "Markdown")}
        >
          <FileCode2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function explainSkipReasonLabel(reason: string | undefined): string {
  if (reason === "non_select") return "非 SELECT 语句";
  if (reason === "executemany") return "批量执行（executemany）";
  if (reason === "missing_parameters") return "缺少绑定参数";
  return reason ?? "不适用";
}
