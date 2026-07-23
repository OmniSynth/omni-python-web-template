import type { ReactNode } from "react";

const labelClass = "line-clamp-1 break-words text-[10px] leading-tight text-muted-foreground";
const valueClass = "mt-0.5 line-clamp-3 break-words text-xs leading-snug";

/** 手机端卡片/列表预览字段：标签 1 行、值自动换行最多 3 行。 */
export function MobilePreviewFieldCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className={labelClass}>{label}</div>
      <div className={valueClass}>{children}</div>
    </div>
  );
}
