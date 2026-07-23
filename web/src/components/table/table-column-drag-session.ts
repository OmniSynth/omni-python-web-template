import type { RefObject } from "react";
import { flushSync } from "react-dom";
import { cloneColumnDragOverlay, EDGE_SCROLL_ZONE, MAX_SCROLL_SPEED, moveDragOverlay } from "./table-column-drag-utils";

export type ColumnDragSession = {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  overlay: HTMLElement;
  frame: number;
};

export function finishColumnDrag(
  dragRef: RefObject<ColumnDragSession | null>,
  previewOrderRef: RefObject<string[]>,
  commit: boolean,
  onReorder: (orderedIds: string[]) => void,
  setDragId: (id: string | null) => void,
  setPreviewOrder: (order: string[]) => void,
): void {
  const drag = dragRef.current;
  if (!drag) return;
  cancelAnimationFrame(drag.frame);
  drag.overlay.remove();
  dragRef.current = null;
  if (commit) onReorder(previewOrderRef.current);
  setDragId(null);
  setPreviewOrder([]);
}

export function beginColumnDrag(
  event: React.PointerEvent<HTMLButtonElement>,
  id: string,
  columnIds: string[],
  previewOrderRef: RefObject<string[]>,
  setDragId: (id: string | null) => void,
  setPreviewOrder: (order: string[]) => void,
): ColumnDragSession | null {
  if (!event.isPrimary || event.button !== 0) return null;
  const card = event.currentTarget.closest<HTMLElement>("[data-column-id]");
  if (!card) return null;
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);

  const bounds = card.getBoundingClientRect();
  const overlay = cloneColumnDragOverlay(card, bounds);
  document.body.append(overlay);

  previewOrderRef.current = columnIds;
  flushSync(() => {
    setPreviewOrder(columnIds);
    setDragId(id);
  });

  const session: ColumnDragSession = {
    id,
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    offsetX: event.clientX - bounds.left,
    offsetY: event.clientY - bounds.top,
    overlay,
    frame: 0,
  };
  moveDragOverlay(overlay, session.x, session.y, session.offsetX, session.offsetY);
  return session;
}

export function updateColumnDragPosition(
  drag: ColumnDragSession,
  event: Pick<PointerEvent, "clientX" | "clientY">,
): void {
  drag.x = event.clientX;
  drag.y = event.clientY;
  moveDragOverlay(drag.overlay, drag.x, drag.y, drag.offsetX, drag.offsetY);
}

export function scheduleColumnDragScroll(
  dragRef: RefObject<ColumnDragSession | null>,
  listRef: RefObject<HTMLDivElement | null>,
  reorderAtPoint: (x: number, y: number) => void,
): void {
  const tick = () => {
    const drag = dragRef.current;
    if (!drag) return;
    const viewport = listRef.current?.closest<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (viewport) {
      const bounds = viewport.getBoundingClientRect();
      let speed = 0;
      if (drag.y < bounds.top + EDGE_SCROLL_ZONE) {
        speed = -MAX_SCROLL_SPEED * (1 - Math.max(0, drag.y - bounds.top) / EDGE_SCROLL_ZONE);
      } else if (drag.y > bounds.bottom - EDGE_SCROLL_ZONE) {
        speed = MAX_SCROLL_SPEED * (1 - Math.max(0, bounds.bottom - drag.y) / EDGE_SCROLL_ZONE);
      }
      if (speed) {
        viewport.scrollTop += speed;
        reorderAtPoint(drag.x, drag.y);
      }
    }
    drag.frame = requestAnimationFrame(tick);
  };
  if (dragRef.current) dragRef.current.frame = requestAnimationFrame(tick);
}
