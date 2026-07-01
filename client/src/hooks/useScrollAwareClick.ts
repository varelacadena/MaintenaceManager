import { useCallback, useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { createScrollAwareActivationState } from "@/lib/scrollAwareActivation";

/** Ignores clicks that follow a scroll/drag gesture (common on mobile lists). */
export function useScrollAwareClick(onActivate: () => void) {
  const activateRef = useRef(onActivate);
  activateRef.current = onActivate;

  const stateRef = useRef(createScrollAwareActivationState());

  useEffect(() => () => stateRef.current.cleanup(), []);

  const onPointerDown = useCallback((e: PointerEvent) => {
    stateRef.current.onPointerDown(e.clientX, e.clientY, e.button, e.pointerId);
  }, []);

  const handleClick = useCallback((e: MouseEvent, shouldActivate: () => boolean = () => true) => {
    if (!shouldActivate()) return;
    if (stateRef.current.shouldSuppressClick()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    activateRef.current();
  }, []);

  return { onPointerDown, handleClick };
}
