import { describe, it, expect, beforeEach } from "vitest";
import { matchesTechFilter, UNASSIGNED_TECH_ID, loadTechFilter, saveTechFilter, loadWorkTab, saveWorkTab } from "../workFilters";

describe("matchesTechFilter", () => {
  it("returns true when no filter is set", () => {
    expect(matchesTechFilter("tech-1", "")).toBe(true);
    expect(matchesTechFilter(null, "")).toBe(true);
  });

  it("matches assigned technician", () => {
    expect(matchesTechFilter("tech-1", "tech-1")).toBe(true);
    expect(matchesTechFilter("tech-2", "tech-1")).toBe(false);
  });

  it("matches unassigned tasks", () => {
    expect(matchesTechFilter(null, UNASSIGNED_TECH_ID)).toBe(true);
    expect(matchesTechFilter(undefined, UNASSIGNED_TECH_ID)).toBe(true);
    expect(matchesTechFilter("tech-1", UNASSIGNED_TECH_ID)).toBe(false);
  });
});

describe("tech filter persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trips the selected technician", () => {
    saveTechFilter("tech-42");
    expect(loadTechFilter()).toBe("tech-42");
  });

  it("clears storage when the filter is removed", () => {
    saveTechFilter("tech-42");
    saveTechFilter("");
    expect(loadTechFilter()).toBe("");
  });
});

describe("work tab persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("defaults to tasks", () => {
    expect(loadWorkTab()).toBe("tasks");
  });

  it("round-trips the selected tab", () => {
    saveWorkTab("projects");
    expect(loadWorkTab()).toBe("projects");
    saveWorkTab("tasks");
    expect(loadWorkTab()).toBe("tasks");
  });
});
