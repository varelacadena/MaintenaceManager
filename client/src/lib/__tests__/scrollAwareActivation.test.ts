import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createScrollAwareActivationState,
  SCROLL_AWARE_TOUCH_SLOP_PX,
} from "../scrollAwareActivation";

class MockPointerEvent extends Event {
  pointerId: number;
  clientX: number;
  clientY: number;

  constructor(
    type: string,
    init: { pointerId?: number; clientX?: number; clientY?: number } = {},
  ) {
    super(type);
    this.pointerId = init.pointerId ?? 0;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
  }
}

vi.stubGlobal("PointerEvent", MockPointerEvent);

describe("createScrollAwareActivationState", () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.();
  });

  function createState() {
    const state = createScrollAwareActivationState();
    cleanups.push(state.cleanup);
    return state;
  }

  it("allows click after a stationary pointer down", () => {
    const state = createState();
    state.onPointerDown(100, 200, 0, 1);
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    expect(state.shouldSuppressClick()).toBe(false);
  });

  it("suppresses click after pointer moves beyond touch slop", () => {
    const state = createState();
    state.onPointerDown(100, 200, 0, 1);
    window.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId: 1,
        clientX: 100,
        clientY: 200 + SCROLL_AWARE_TOUCH_SLOP_PX + 1,
      }),
    );
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    expect(state.shouldSuppressClick()).toBe(true);
  });

  it("ignores non-primary button presses", () => {
    const state = createState();
    state.onPointerDown(100, 200, 1, 1);
    expect(state.shouldSuppressClick()).toBe(false);
  });
});
