import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampExpandFabPosition,
  defaultExpandFabPosition,
  type ExpandFabPosition,
  type NavMenuPosition,
} from "@/lib/device-nav-layout";

const DRAG_THRESHOLD_PX = 5;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type UseSideNavExpandFabOptions = {
  side: Extract<NavMenuPosition, "left" | "right">;
  position?: ExpandFabPosition;
  onPositionChange: (position: ExpandFabPosition) => void;
  onExpand: () => void;
};

export function useSideNavExpandFab({ side, position, onPositionChange, onExpand }: UseSideNavExpandFabOptions) {
  const [coords, setCoords] = useState<ExpandFabPosition>(() => position ?? defaultExpandFabPosition(side));
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    setCoords(position ?? defaultExpandFabPosition(side));
  }, [position, side]);

  useEffect(() => {
    function handleResize() {
      setCoords((prev) => {
        const next = clampExpandFabPosition(prev.x, prev.y);
        if (next.x === prev.x && next.y === prev.y) return prev;
        onPositionChange(next);
        return next;
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onPositionChange]);

  const finishDrag = useCallback(
    (state: DragState, next: ExpandFabPosition) => {
      dragRef.current = null;
      setDragging(false);
      if (state.moved) {
        onPositionChange(next);
        return;
      }
      onExpand();
    },
    [onExpand, onPositionChange],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: coords.x,
        originY: coords.y,
        moved: false,
      };
      setDragging(true);
    },
    [coords.x, coords.y],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      state.moved = true;
    }
    setCoords(clampExpandFabPosition(state.originX + dx, state.originY + dy));
  }, []);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = dragRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      finishDrag(
        state,
        clampExpandFabPosition(
          state.originX + (event.clientX - state.startX),
          state.originY + (event.clientY - state.startY),
        ),
      );
    },
    [finishDrag],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = dragRef.current;
      if (!state || state.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      finishDrag(state, coords);
    },
    [coords, finishDrag],
  );

  return {
    coords,
    dragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
