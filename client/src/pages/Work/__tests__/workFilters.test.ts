import { describe, it, expect } from "vitest";
import { matchesTechFilter, UNASSIGNED_TECH_ID } from "../workFilters";

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
