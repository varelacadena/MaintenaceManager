import { afterEach, describe, expect, it, vi } from "vitest";
import { goBack } from "../navigation";
import {
  canGoBackInApp,
  resetNavigationHistoryForTests,
  trackLocation,
} from "../navigationHistory";

describe("in-app back", () => {
  afterEach(() => {
    history.replaceState({}, "", "/");
    resetNavigationHistoryForTests();
  });

  it("has no previous page when the screen was opened directly", () => {
    trackLocation("/tasks/task-1");
    expect(canGoBackInApp()).toBe(false);
  });

  it("returns to the previous page after moving forward", () => {
    trackLocation("/properties");
    history.pushState({}, "", "/properties/building-1");
    trackLocation("/properties/building-1");
    expect(canGoBackInApp()).toBe(true);

    const back = vi.spyOn(history, "back").mockImplementation(() => {});
    const setLocation = vi.fn();
    goBack(setLocation, "/properties/building-1", "admin");
    expect(back).toHaveBeenCalledOnce();
    expect(setLocation).not.toHaveBeenCalled();
    back.mockRestore();
  });

  it("uses the parent page when there is no previous page", () => {
    trackLocation("/tasks/task-1");
    const setLocation = vi.fn();
    goBack(setLocation, "/tasks/task-1", "admin");
    expect(setLocation).toHaveBeenCalledWith("/work", { replace: true });
  });

  it("keeps filter address changes on the same page", () => {
    trackLocation("/analytics");
    history.replaceState({}, "", "/analytics?tab=fleet");
    trackLocation("/analytics?tab=fleet");
    expect(canGoBackInApp()).toBe(false);
  });
});
