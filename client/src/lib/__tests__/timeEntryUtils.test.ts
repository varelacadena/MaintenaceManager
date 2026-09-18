import { describe, expect, it } from "vitest";
import {
  buildManualTimeEntryRange,
  durationFromHoursAndMinutes,
  splitMinutes,
} from "../timeEntryUtils";

describe("manual time log helpers", () => {
  it("converts hours and minutes into a duration", () => {
    expect(durationFromHoursAndMinutes("2", "30")).toBe(150);
    expect(durationFromHoursAndMinutes("", "15")).toBe(15);
    expect(durationFromHoursAndMinutes("1", "")).toBe(60);
    expect(durationFromHoursAndMinutes("-1", "10")).toBe(0);
  });

  it("splits minutes back into hours and minutes", () => {
    expect(splitMinutes(150)).toEqual({ hours: "2", minutes: "30" });
    expect(splitMinutes(0)).toEqual({ hours: "0", minutes: "0" });
  });

  it("places a same-day log against the current time", () => {
    const now = new Date(2026, 8, 17, 14, 20, 0);
    const range = buildManualTimeEntryRange(90, "2026-09-17", now);
    expect(range.endTime.getTime()).toBe(now.getTime());
    expect(range.startTime.getTime()).toBe(now.getTime() - 90 * 60_000);
  });

  it("places a past-day log at the end of that workday", () => {
    const now = new Date(2026, 8, 17, 14, 20, 0);
    const range = buildManualTimeEntryRange(60, "2026-09-10", now);
    expect(range.endTime.getHours()).toBe(17);
    expect(range.endTime.getDate()).toBe(10);
    expect(range.startTime.getHours()).toBe(16);
  });
});
