import { LayoutGrid, List } from "lucide-react";
import type { TableMobileLayout } from "@/components/table/table-mobile-layout";
import { Button } from "@/components/ui/button";
import { useMobileTableLayout } from "@/hooks/use-mobile-table-layout";
import { cn } from "@/lib/utils";

type TableMobileLayoutToggleProps = {
  defaultLayout?: TableMobileLayout;
  className?: string;
};

/** 手机端表格布局切换：正方形 icon，高度与「自定义字段」一致；仅 lg 以下显示。 */
export function TableMobileLayoutToggle({ defaultLayout = "list", className }: TableMobileLayoutToggleProps) {
  const { layout, setLayout } = useMobileTableLayout(defaultLayout);
  const nextLayout: TableMobileLayout = layout === "masonry" ? "list" : "masonry";
  const Icon = layout === "masonry" ? LayoutGrid : List;
  const switchLabel = layout === "masonry" ? "切换为列表布局" : "切换为卡片布局";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("shrink-0 lg:hidden", className)}
      aria-label={switchLabel}
      title={switchLabel}
      onClick={() => setLayout(nextLayout)}
    >
      <Icon className="size-4" />
    </Button>
  );
}
