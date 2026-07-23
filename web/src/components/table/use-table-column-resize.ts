import { useCallback, useEffect, useRef, useState } from "react";
import { MIN_COLUMN_WIDTH, resolveColumnPixelWidth } from "@/types/table-preference";

export type TableColumnResizePreview = { columnId: string; width: number } | null;

interface UseTableColumnResizeOptions {
  /** 拖拽结束时提交列宽（写偏好并同步后端） */
  onCommit?: (columnId: string, width: number) => void;
  /** 拖拽取消（未提交）时清理预览态 */
  onCancel?: () => void;
}

type DragState = {
  active: boolean;
  columnId: string;
  startX: number;
  startWidth: number;
  currentWidth: number;
};

/** PC 端表头列宽拖拽：拖动中本地预览，松手后一次性提交。 */
export function useTableColumnResize({ onCommit, onCancel }: UseTableColumnResizeOptions) {
  const [preview, setPreview] = useState<TableColumnResizePreview>(null);
  const dragRef = useRef<DragState | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const stopDrag = useCallback((commit: boolean) => {
    const drag = dragRef.current;
    if (!drag?.active) return;
    const { columnId, currentWidth } = drag;
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setPreview(null);
    if (commit) {
      onCommitRef.current?.(columnId, currentWidth);
    } else {
      onCancelRef.current?.();
    }
  }, []);

  useEffect(() => {
    if (!onCommit) return;

    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag?.active) return;
      const next = Math.max(MIN_COLUMN_WIDTH, resolveColumnPixelWidth(drag.startWidth + (event.clientX - drag.startX)));
      drag.currentWidth = next;
      setPreview({ columnId: drag.columnId, width: next });
    }

    function onPointerUp() {
      stopDrag(true);
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      stopDrag(false);
    };
  }, [onCommit, stopDrag]);

  const startResize = useCallback(
    (columnId: string, startWidth: number, event: React.PointerEvent) => {
      if (!onCommit) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        active: true,
        columnId,
        startX: event.clientX,
        startWidth,
        currentWidth: startWidth,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      setPreview({ columnId, width: startWidth });
    },
    [onCommit],
  );

  return { preview, startResize, enabled: Boolean(onCommit) };
}
