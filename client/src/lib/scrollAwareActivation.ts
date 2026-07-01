/** Movement beyond this threshold is treated as scroll/drag, not tap. */
export const SCROLL_AWARE_TOUCH_SLOP_PX = 12;

type Point = { x: number; y: number };

export function createScrollAwareActivationState() {
  let pointerId: number | null = null;
  let start: Point | null = null;
  let moved = false;
  let moveListener: ((e: PointerEvent) => void) | null = null;
  let endListener: ((e: PointerEvent) => void) | null = null;

  const cleanup = () => {
    if (moveListener) {
      window.removeEventListener("pointermove", moveListener);
      moveListener = null;
    }
    if (endListener) {
      window.removeEventListener("pointerup", endListener);
      window.removeEventListener("pointercancel", endListener);
      endListener = null;
    }
    pointerId = null;
    start = null;
  };

  const onPointerDown = (clientX: number, clientY: number, button: number, id: number) => {
    if (button !== 0) return;
    cleanup();
    pointerId = id;
    start = { x: clientX, y: clientY };
    moved = false;

    moveListener = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || !start) return;
      const dx = Math.abs(ev.clientX - start.x);
      const dy = Math.abs(ev.clientY - start.y);
      if (dx > SCROLL_AWARE_TOUCH_SLOP_PX || dy > SCROLL_AWARE_TOUCH_SLOP_PX) {
        moved = true;
      }
    };

    endListener = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (moveListener) window.removeEventListener("pointermove", moveListener);
      if (endListener) {
        window.removeEventListener("pointerup", endListener);
        window.removeEventListener("pointercancel", endListener);
      }
      moveListener = null;
      endListener = null;
      pointerId = null;
      start = null;
    };

    window.addEventListener("pointermove", moveListener, { passive: true });
    window.addEventListener("pointerup", endListener);
    window.addEventListener("pointercancel", endListener);
  };

  const shouldSuppressClick = () => {
    const suppress = moved;
    moved = false;
    return suppress;
  };

  return { onPointerDown, shouldSuppressClick, cleanup };
}
