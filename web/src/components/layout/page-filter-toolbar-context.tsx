import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFilterGridConfig } from "@/hooks/useFilterGridConfig";
import { filterToolbarButtonClass } from "@/lib/field-control";

export type PageFilterToolbarMobileHeaderState = {
  showActionBar: boolean;
  showCollapse: boolean;
  expanded: boolean;
  hiddenActiveCount: number;
  actions: ReactNode | null;
  toggleExpanded: () => void;
};

const emptyMobileHeaderState: PageFilterToolbarMobileHeaderState = {
  showActionBar: false,
  showCollapse: false,
  expanded: false,
  hiddenActiveCount: 0,
  actions: null,
  toggleExpanded: () => {},
};

type PageFilterToolbarContextValue = {
  mobileActionsInHeader: boolean;
  hiddenActiveCount: number;
  mobileHeaderState: PageFilterToolbarMobileHeaderState;
  setMobileHeaderState: Dispatch<SetStateAction<PageFilterToolbarMobileHeaderState>>;
};

const PageFilterToolbarContext = createContext<PageFilterToolbarContextValue | null>(null);

type PageFilterToolbarProviderProps = {
  children: ReactNode;
  hiddenActiveCount?: number;
};

/** 包裹含 PageFilterToolbar 的列表页；手机端将筛选区功能按钮提升到 PageHeader。 */
export function PageFilterToolbarProvider({ children, hiddenActiveCount = 0 }: PageFilterToolbarProviderProps) {
  const [mobileHeaderState, setMobileHeaderState] =
    useState<PageFilterToolbarMobileHeaderState>(emptyMobileHeaderState);

  const value = useMemo(
    () => ({
      mobileActionsInHeader: true,
      hiddenActiveCount,
      mobileHeaderState,
      setMobileHeaderState,
    }),
    [hiddenActiveCount, mobileHeaderState],
  );

  return <PageFilterToolbarContext.Provider value={value}>{children}</PageFilterToolbarContext.Provider>;
}

export function usePageFilterToolbarContext() {
  return useContext(PageFilterToolbarContext);
}

function FilterToolbarCollapseButton({
  expanded,
  hiddenActiveCount,
  onToggle,
}: {
  expanded: boolean;
  hiddenActiveCount: number;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={filterToolbarButtonClass}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      {expanded ? "收起" : "展开"}
      {!expanded && hiddenActiveCount > 0 ? (
        <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
          {hiddenActiveCount}
        </Badge>
      ) : null}
    </Button>
  );
}

/** 手机端页头功能按钮：筛选展开/收起 + 业务操作，位于「自定义字段」左侧。 */
export function PageFilterToolbarHeaderActions({ actions }: { actions?: ReactNode }) {
  const ctx = usePageFilterToolbarContext();
  const { isMobile } = useFilterGridConfig();
  if (!ctx?.mobileActionsInHeader || !isMobile) return null;

  const state = ctx.mobileHeaderState;
  const resolvedActions = actions ?? state.actions;
  if (!state.showActionBar && !resolvedActions) return null;

  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2">
      {state.showCollapse ? (
        <FilterToolbarCollapseButton
          expanded={state.expanded}
          hiddenActiveCount={state.hiddenActiveCount}
          onToggle={state.toggleExpanded}
        />
      ) : null}
      {resolvedActions}
    </div>
  );
}
