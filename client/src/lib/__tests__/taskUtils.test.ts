import { describe, expect, it } from "vitest";
import { formatScheduledTime, formatTaskDate, formatTaskDateTime, taskDeleteUrl, taskDeleteWarning, taskOffersSeriesDelete } from "../taskUtils";

describe("task schedule formatting", () => {
  it("formats 24-hour scheduled times for display", () => {
    expect(formatScheduledTime("09:05")).toBe("9:05 AM");
    expect(formatScheduledTime("14:30")).toBe("2:30 PM");
    expect(formatScheduledTime("00:00")).toBe("12:00 AM");
    expect(formatScheduledTime(null, "Not set")).toBe("Not set");
  });

  it("offers a series delete only for repeating tasks", () => {
    expect(taskOffersSeriesDelete({ taskType: "recurring" })).toBe(true);
    expect(taskOffersSeriesDelete({ taskType: "one_time" })).toBe(false);
    expect(taskDeleteWarning({ taskType: "recurring", recurringFrequency: null, status: "not_started" }))
      .toContain("every other open copy");
    expect(taskDeleteWarning({ taskType: "recurring", recurringFrequency: "monthly", status: "not_started" }))
      .toContain("stops the schedule");
    expect(taskDeleteUrl("abc", "one")).toBe("/api/tasks/abc");
    expect(taskDeleteUrl("abc", "series")).toBe("/api/tasks/abc?scope=series");
  });

  it("formats completion timestamps with time when it is not a date-only noon value", () => {
    expect(formatTaskDate("2026-09-16T12:00:00")).toBe("Sep 16, 2026");
    expect(formatTaskDateTime("2026-09-16T12:00:00")).toBe("Sep 16, 2026");
    expect(formatTaskDateTime("2026-09-16T15:42:00")).toBe("Sep 16, 2026 at 3:42 PM");
    expect(formatTaskDateTime(null, "Not set")).toBe("Not set");
  });
});
