import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TableSettingsButtonProps {
  onClick: () => void;
  /** 与 PageHeader 或表格区块标题一致，用于无障碍标签。 */
  title: string;
  /** 页内 Tab 等次级标题；无 Tab 时可省略。 */
  subtitle?: string;
}

/** 页头「自定义字段」按钮：手机端仅 icon，桌面端带文案。 */
export function TableSettingsButton({ onClick, title, subtitle }: TableSettingsButtonProps) {
  const ariaLabel = subtitle ? `${title} · ${subtitle} 自定义字段` : `${title} 自定义字段`;

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn("size-9 shrink-0 px-0 lg:h-9 lg:w-auto lg:px-4")}
      onClick={onClick}
    >
      <Settings2 className="size-4 shrink-0" />
      <span className="hidden lg:inline">自定义字段</span>
    </Button>
  );
}
