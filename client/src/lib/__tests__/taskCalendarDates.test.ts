import { describe, expect, it } from "vitest";
import {
  dateInputValuePreservingTime,
  dateInputValueToTaskTimestamp,
  getTaskDateInputValue,
} from "../taskCalendarDates";

describe("task calendar dates", () => {
  it("preserves the original time of day when only the date changes", () => {
    expect(dateInputValuePreservingTime("2026-09-16", "2026-09-10T15:42:08")).toBe("2026-09-16T15:42:08");
    expect(dateInputValuePreservingTime("2026-09-16", null)).toBe("2026-09-16T12:00:00");
  });

  it("keeps date input values on the selected calendar day", () => {
    expect(getTaskDateInputValue("2026-06-08T00:00:00.000Z")).toBe("2026-06-08");
    expect(dateInputValueToTaskTimestamp("2026-06-08")).toBe("2026-06-08T12:00:00");
  });
});
