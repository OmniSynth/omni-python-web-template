import type { RefObject } from "react";
import { flushSync } from "react-dom";

export const EDGE_SCROLL_ZONE = 88;
export const MAX_SCROLL_SPEED = 18;

/** FLIP 动画更新列预览顺序。 */
export function animateColumnReorder(
  listRef: RefObject<HTMLDivElement | null>,
  previewOrderRef: RefObject<string[]>,
  setPreviewOrder: (order: string[]) => void,
  next: string[],
): void {
  const before = new Map(
    Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-column-id]") ?? []).map((element) => [
      element.dataset.columnId,
      element.getBoundingClientRect().top,
    ]),
  );
  previewOrderRef.current = next;
  flushSync(() => setPreviewOrder(next));
  for (const element of listRef.current?.querySelectorAll<HTMLElement>("[data-column-id]") ?? []) {
    const previousTop = before.get(element.dataset.columnId);
    if (previousTop === undefined) continue;
    const offset = previousTop - element.getBoundingClientRect().top;
    if (Math.abs(offset) < 1) continue;
    element.animate([{ transform: `translateY(${offset}px)` }, { transform: "translateY(0)" }], {
      duration: 180,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    });
  }
}

/** 克隆列卡片作为拖拽浮层。 */
export function cloneColumnDragOverlay(card: HTMLElement, bounds: DOMRect): HTMLElement {
  const overlay = card.cloneNode(true) as HTMLElement;
  overlay.querySelectorAll("[id]").forEach((element) => {
    element.removeAttribute("id");
  });
  overlay.setAttribute("aria-hidden", "true");
  overlay.inert = true;
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0 auto auto 0",
    zIndex: "100",
    width: `${bounds.width}px`,
    margin: "0",
    pointerEvents: "none",
    boxShadow: "0 22px 55px rgb(0 0 0 / 35%)",
    willChange: "transform",
  });
  return overlay;
}

export function moveDragOverlay(overlay: HTMLElement, x: number, y: number, offsetX: number, offsetY: number): void {
  overlay.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0) rotate(0.4deg) scale(1.015)`;
}

/** 根据指针位置计算插入顺序。 */
export function reorderColumnIdsAtPoint(
  previewOrder: string[],
  dragId: string,
  target: HTMLElement,
  y: number,
): string[] | null {
  const targetId = target.dataset.columnId;
  if (!targetId || targetId === dragId) return null;

  const withoutDragged = previewOrder.filter((id) => id !== dragId);
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex < 0) return null;
  const insertAt = y < target.getBoundingClientRect().top + target.offsetHeight / 2 ? targetIndex : targetIndex + 1;
  const next = [...withoutDragged];
  next.splice(insertAt, 0, dragId);
  if (next.every((id, index) => id === previewOrder[index])) return null;
  return next;
}
