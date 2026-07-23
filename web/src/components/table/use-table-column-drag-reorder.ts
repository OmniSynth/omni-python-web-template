import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { moveColumnByAction, moveColumnByKeyboard } from "@/components/table/table-column-order-moves";
import type { TableColumnDef, TableColumnPreference } from "@/types/table-preference";
import { normalizeColumnOrderIds, resolveActionColumnIds } from "@/types/table-preference";
import {
  beginColumnDrag,
  type ColumnDragSession,
  finishColumnDrag,
  scheduleColumnDragScroll,
  updateColumnDragPosition,
} from "./table-column-drag-session";
import { animateColumnReorder, reorderColumnIdsAtPoint } from "./table-column-drag-utils";

export type EditableTableColumn<T> = {
  def: TableColumnDef<T>;
  pref: TableColumnPreference | undefined;
};

function bindColumnDragPointerListeners(
  dragRef: RefObject<ColumnDragSession | null>,
  reorderAtPoint: (x: number, y: number) => void,
  finishDrag: (commit: boolean) => void,
) {
  const move = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateColumnDragPosition(drag, event);
    reorderAtPoint(drag.x, drag.y);
  };
  const up = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    finishDrag(true);
  };
  const cancel = () => finishDrag(false);
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("blur", cancel);
  return () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("blur", cancel);
  };
}

/** 列设置抽屉内的拖拽排序。 */
export function useTableColumnDragReorder<T>(
  editableColumns: EditableTableColumn<T>[],
  onReorder: (orderedIds: string[]) => void,
  defaultColumns: TableColumnDef<T>[],
) {
  const actionIds = useMemo(() => resolveActionColumnIds(defaultColumns), [defaultColumns]);

  const commitOrder = useCallback(
    (ids: string[]) => {
      onReorder(normalizeColumnOrderIds(ids, actionIds));
    },
    [actionIds, onReorder],
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const previewOrderRef = useRef<string[]>([]);
  const dragRef = useRef<ColumnDragSession | null>(null);

  const renderedColumns = useMemo(() => {
    if (!dragId) return editableColumns;
    const byId = new Map(editableColumns.map((column) => [column.def.id, column]));
    return previewOrder.map((id) => byId.get(id)).filter((column) => column !== undefined);
  }, [dragId, editableColumns, previewOrder]);

  const animateToOrder = useCallback((next: string[]) => {
    animateColumnReorder(listRef, previewOrderRef, setPreviewOrder, next);
  }, []);

  const reorderAtPoint = useCallback(
    (x: number, y: number) => {
      const drag = dragRef.current;
      if (!drag) return;
      const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-column-id]");
      if (!target) return;
      const next = reorderColumnIdsAtPoint(previewOrderRef.current, drag.id, target, y);
      if (next) animateToOrder(next);
    },
    [animateToOrder],
  );

  const finishDrag = useCallback(
    (commit: boolean) => {
      finishColumnDrag(dragRef, previewOrderRef, commit, commitOrder, setDragId, setPreviewOrder);
    },
    [commitOrder],
  );

  useEffect(() => () => finishDrag(false), [finishDrag]);

  useEffect(() => {
    if (!dragId) return;
    return bindColumnDragPointerListeners(dragRef, reorderAtPoint, finishDrag);
  }, [dragId, finishDrag, reorderAtPoint]);

  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
      if (actionIds.includes(id)) return;
      finishDrag(false);
      const session = beginColumnDrag(
        event,
        id,
        editableColumns.map((column) => column.def.id).filter((columnId) => !actionIds.includes(columnId)),
        previewOrderRef,
        setDragId,
        setPreviewOrder,
      );
      if (!session) return;
      dragRef.current = session;
      scheduleColumnDragScroll(dragRef, listRef, reorderAtPoint);
    },
    [actionIds, editableColumns, finishDrag, reorderAtPoint],
  );

  const columnIds = useMemo(() => editableColumns.map((column) => column.def.id), [editableColumns]);

  const moveByKeyboard = useCallback(
    (id: string, direction: -1 | 1) => {
      const next = moveColumnByKeyboard(columnIds, id, direction, actionIds);
      if (next) commitOrder(next);
    },
    [actionIds, columnIds, commitOrder],
  );

  const moveColumn = useCallback(
    (id: string, action: "top" | "up" | "down" | "bottom") => {
      const next = moveColumnByAction(columnIds, id, action, actionIds);
      if (next) commitOrder(next);
    },
    [actionIds, columnIds, commitOrder],
  );

  return {
    listRef,
    dragId,
    renderedColumns,
    startDrag,
    moveByKeyboard,
    moveColumn,
  };
}
