import { describe, expect, it } from "vitest";
import { parseDateBasis, parseLocalDayEnd, parseLocalDayStart, parsePropertyIds } from "../localDates";

describe("local calendar dates", () => {
  it("reads a date-only value as a local day, not UTC midnight", () => {
    const start = parseLocalDayStart("2026-07-01");
    const end = parseLocalDayEnd("2026-07-10");
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(6);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(end.getDate()).toBe(10);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it("reads one building or several from the property filter", () => {
    expect(parsePropertyIds("")).toEqual([]);
    expect(parsePropertyIds("north, south,north")).toEqual(["north", "south"]);
  });

  it("defaults an unknown date basis to active", () => {
    expect(parseDateBasis(undefined)).toBe("active");
    expect(parseDateBasis("created")).toBe("created");
    expect(parseDateBasis("nope")).toBe("active");
  });
});
