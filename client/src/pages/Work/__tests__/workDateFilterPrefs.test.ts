import { describe, it, expect, beforeEach } from "vitest";
import {
  isWorkDateFilter,
  loadWorkDateFilter,
  saveWorkDateFilter,
} from "../workDateFilterPrefs";

describe("workDateFilterPrefs", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("defaults to today when nothing is stored", () => {
    expect(loadWorkDateFilter()).toBe("today");
  });

  it("round-trips a valid filter", () => {
    saveWorkDateFilter("week");
    expect(loadWorkDateFilter()).toBe("week");
    saveWorkDateFilter("all");
    expect(loadWorkDateFilter()).toBe("all");
  });

  it("ignores invalid stored values", () => {
    sessionStorage.setItem("work-date-filter", "tomorrow");
    expect(loadWorkDateFilter()).toBe("today");
    expect(isWorkDateFilter("tomorrow")).toBe(false);
    expect(isWorkDateFilter("week")).toBe(true);
  });
});
