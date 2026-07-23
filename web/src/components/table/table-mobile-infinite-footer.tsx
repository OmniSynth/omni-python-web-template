type TableMobileInfiniteFooterProps = {
  loading?: boolean;
  hasMore: boolean;
  loadedCount: number;
  total?: number;
};

/** 手机端无限滚动列表底部状态。 */
export function TableMobileInfiniteFooter({ loading, hasMore, loadedCount, total }: TableMobileInfiniteFooterProps) {
  if (loadedCount === 0 && !loading) return null;

  let message = "上拉加载更多";
  if (loading) {
    message = "加载中…";
  } else if (!hasMore) {
    message = total != null ? `已加载全部 ${total} 条` : "已加载全部";
  }

  return (
    <div className="py-3 text-center text-xs text-muted-foreground" aria-live="polite">
      {message}
    </div>
  );
}
