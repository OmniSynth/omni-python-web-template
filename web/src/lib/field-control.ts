import { cn } from "@/lib/utils";

/** 文本/下拉等单行控件：柔白底 + 可见边框；禁用用更深灰底区分。 */
export const fieldControlClass = cn(
  "flex h-11 w-full rounded-lg border border-input bg-field px-3.5 py-2",
  "text-base shadow-none transition-[background-color,box-shadow,border-color] duration-200 ease-out",
  "placeholder:text-muted-foreground/55",
  "hover:border-primary/30",
  "focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15",
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:opacity-70",
  "aria-invalid:border-destructive/50 aria-invalid:ring-[3px] aria-invalid:ring-destructive/15",
  "md:text-sm",
);

/** 多行文本控件。 */
export const fieldTextareaClass = cn(
  "field-sizing-content min-h-24 w-full rounded-lg border border-input bg-field px-3.5 py-3",
  "text-base shadow-none transition-[background-color,box-shadow,border-color] duration-200 ease-out",
  "placeholder:text-muted-foreground/55",
  "hover:border-primary/30",
  "focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15",
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:opacity-70",
  "aria-invalid:border-destructive/50 aria-invalid:ring-[3px] aria-invalid:ring-destructive/15",
  "md:text-sm",
);

/** 字段标签：小字、弱对比，置于控件上方。 */
export const fieldLabelClass = "text-xs font-medium tracking-wide text-muted-foreground";

/** 筛选/表单字段纵向间距。 */
export const fieldStackClass = "grid gap-1.5";

/** 筛选工具栏：统一 N 列 + 操作列网格。 */
export const filterToolbarGridClass = "grid w-full gap-x-3 gap-y-3";

/** @deprecated 使用 filterToolbarGridStyle */
export const filterToolbarGridWithActionsClass = "";

/** 手机展开：单列堆叠。 */
export const filterToolbarGridMobileExpandedClass = "grid-cols-1 items-stretch";
export const filterPanelRowStretchClass = "flex w-full gap-3";

/** @deprecated 使用 filterToolbarGridStyle 统一栅格 */
export const filterPanelRowStretchFullClass = "";

/** @deprecated action 行字段直接作为 grid 子元素放置 */
export const filterPanelRowActionClass = "grid min-w-0 gap-3";

/** 筛选项 grid / flex 单元（固定宽行）。 */
export const filterFieldCellClass = "min-w-0";

/** 自适应拉伸行内的字段单元。 */
export const filterFieldCellStretchClass = "min-w-0 flex-1";

/** 筛选区功能按钮尺寸（与「展开/收起」一致）。 */
export const filterToolbarButtonClass = "h-11 shrink-0 px-3";

/** 右侧操作列：展开/收起在最左，其余按钮在其右，整组贴容器右缘。 */
export const filterPanelActionsClass = cn(
  "flex shrink-0 items-center justify-end gap-2 self-end",
  "[&_button]:h-11 [&_button]:shrink-0 [&_button]:px-3",
);

/** 手机端筛选区功能按钮行：全宽排列，整组贴右缘。 */
export const filterPanelActionsMobileClass = cn(filterPanelActionsClass, "w-full");

export type FilterFieldSpan = 3 | 4 | 5 | 6;

/** @deprecated 统一使用 filterFieldCellClass */
export const filterFieldFlexClass: Record<FilterFieldSpan, string> = {
  3: filterFieldCellClass,
  4: filterFieldCellClass,
  5: filterFieldCellClass,
  6: filterFieldCellClass,
};

/** @deprecated 使用 filterFieldCellClass */
export const filterFieldSpanClass = filterFieldFlexClass;
