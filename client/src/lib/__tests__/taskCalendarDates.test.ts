import { describe, expect, it } from "vitest";
import type { Task } from "@shared/schema";
import {
  dateInputValueToTaskTimestamp,
  getCalendarDateKey,
  getTaskActiveDateKeys,
  getTaskDateInputValue,
  getTaskReschedulePayload,
  taskCoversDate,
} from "../taskCalendarDates";

type CalendarTask = Pick<Task, "initialDate" | "estimatedCompletionDate">;

function task(initialDate: string, estimatedCompletionDate?: string): CalendarTask {
  return {
    initialDate: new Date(`${initialDate}T12:00:00`),
    estimatedCompletionDate: estimatedCompletionDate
      ? new Date(`${estimatedCompletionDate}T12:00:00`)
      : null,
  };
}

describe("task calendar dates", () => {
  it("normalizes inverted task ranges instead of dropping the task", () => {
    const inverted = task("2026-05-10", "2026-05-05");

    expect(taskCoversDate(inverted, new Date("2026-05-07T12:00:00"))).toBe(true);
    expect(getTaskActiveDateKeys(inverted)).toContain("2026-05-05");
    expect(getTaskActiveDateKeys(inverted)).toContain("2026-05-10");
  });

  it("generates only visible keys for long tasks without losing later dates", () => {
    const longTask = task("2026-01-01", "2026-04-15");

    expect(
      getTaskActiveDateKeys(
        longTask,
        new Date("2026-04-01T12:00:00"),
        new Date("2026-04-30T12:00:00"),
      ),
    ).toContain("2026-04-15");
  });

  it("preserves duration when rescheduling a dated task", () => {
    const datedTask = task("2026-05-01", "2026-05-03");
    const payload = getTaskReschedulePayload(datedTask, new Date("2026-05-10T12:00:00"));

    expect(payload).not.toBeNull();
    expect(getCalendarDateKey(payload?.initialDate)).toBe("2026-05-08");
    expect(getCalendarDateKey(payload?.estimatedCompletionDate)).toBe("2026-05-10");
  });

  it("keeps date input values on the selected calendar day", () => {
    expect(getTaskDateInputValue("2026-06-08T00:00:00.000Z")).toBe("2026-06-08");
    expect(dateInputValueToTaskTimestamp("2026-06-08")).toBe("2026-06-08T12:00:00");
  });
});
