import { describe, it, expect, vi } from "vitest";
import type { KeyboardEvent } from "react";
import {
  buildStatusGroupAriaLabel,
  buildTaskRowAriaLabel,
  handleKeyboardActivate,
} from "../workA11y";
import {
  loadCollapsedGroupsFromStorage,
  saveCollapsedGroupsToStorage,
} from "../workGroupPrefs";
import { flattenDayGroups } from "../helpers";

describe("workA11y", () => {
  it("buildTaskRowAriaLabel includes name and status", () => {
    const label = buildTaskRowAriaLabel({ name: "Fix HVAC", status: "in_progress" });
    expect(label).toContain("Fix HVAC");
    expect(label).toContain("in progress");
  });

  it("buildStatusGroupAriaLabel reflects expansion", () => {
    expect(buildStatusGroupAriaLabel("In Progress", 3, true)).toContain("expanded");
    expect(buildStatusGroupAriaLabel("In Progress", 3, false)).toContain("collapsed");
  });

  it("handleKeyboardActivate runs on Enter and Space", () => {
    const fn = vi.fn();
    handleKeyboardActivate({ key: "Enter", preventDefault: vi.fn() } as unknown as KeyboardEvent, fn);
    handleKeyboardActivate({ key: " ", preventDefault: vi.fn() } as unknown as KeyboardEvent, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("handleKeyboardActivate ignores other keys", () => {
    const fn = vi.fn();
    handleKeyboardActivate({ key: "Tab", preventDefault: vi.fn() } as unknown as KeyboardEvent, fn);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("workGroupPrefs storage", () => {
  it("round-trips collapse state", () => {
    const data = { not_started: false, in_progress: true };
    saveCollapsedGroupsToStorage(data);
    expect(loadCollapsedGroupsFromStorage()).toEqual(data);
  });
});

describe("flattenDayGroups", () => {
  it("assigns continuous global indices", () => {
    const flat = flattenDayGroups([
      { label: "Monday", dateKey: "a", tasks: [{ id: "1" } as never, { id: "2" } as never] },
      { label: "Tuesday", dateKey: "b", tasks: [{ id: "3" } as never] },
    ]);
    expect(flat.map((x) => x.globalIndex)).toEqual([0, 1, 2]);
  });
});
