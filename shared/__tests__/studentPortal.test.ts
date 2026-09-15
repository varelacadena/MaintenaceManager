import { describe, expect, it } from "vitest";
import {
  adminStudentTimeEntryPatchSchema,
  assertClockRange,
  computeDurationMinutes,
  elapsedMilliseconds,
  formatDurationMinutes,
  formatLiveDuration,
  hoursFromMinutes,
  localDateString,
  localWeekRange,
  msUntilNextLocalMidnight,
  resolveEntryMinutes,
  startOfLocalWeek,
  startOfNextLocalDay,
  isStudentSessionExpired,
  studentClockInRequestSchema,
  studentRecapRequestSchema,
  studentTimeEditRequestSchema,
  toDateTimeLocalValue,
  weekDurationMs,
} from "../studentPortal";

describe("studentPortal helpers", () => {
  it("computes duration in whole minutes", () => {
    const start = new Date("2026-09-13T12:00:00.000Z");
    const end = new Date("2026-09-13T14:30:00.000Z");
    expect(computeDurationMinutes(start, end)).toBe(150);
  });

  it("never returns negative duration", () => {
    const start = new Date("2026-09-13T14:00:00.000Z");
    const end = new Date("2026-09-13T13:00:00.000Z");
    expect(computeDurationMinutes(start, end)).toBe(0);
  });

  it("formats recorded time as hours and minutes", () => {
    expect(formatDurationMinutes(0)).toBe("0h 00m");
    expect(formatDurationMinutes(12)).toBe("0h 12m");
    expect(formatDurationMinutes(60)).toBe("1h 00m");
    expect(formatDurationMinutes(150)).toBe("2h 30m");
  });

  it("formats a live clock with seconds so a just-started shift is not stuck at 0h 00m", () => {
    expect(formatLiveDuration(0)).toBe("0h 00m 00s");
    expect(formatLiveDuration(12_000)).toBe("0h 00m 12s");
    expect(formatLiveDuration(75_000)).toBe("0h 01m 15s");
    expect(formatLiveDuration(3_661_000)).toBe("1h 01m 01s");
  });

  it("computes elapsed milliseconds from a clock-in time", () => {
    const start = new Date("2026-09-13T22:00:00.000Z");
    const now = new Date("2026-09-13T22:05:30.000Z");
    expect(elapsedMilliseconds(start, now)).toBe(330_000);
    expect(elapsedMilliseconds("not-a-date", now)).toBe(0);
    expect(elapsedMilliseconds(null, now)).toBe(0);
  });

  it("adds an open shift to closed week minutes", () => {
    const clockInAt = new Date("2026-09-13T22:00:00.000Z");
    const now = new Date("2026-09-13T22:10:00.000Z");
    expect(weekDurationMs(90, clockInAt, now)).toBe(90 * 60_000 + 10 * 60_000);
    expect(weekDurationMs(90, null, now)).toBe(90 * 60_000);
  });

  it("computes live minutes for an open entry even if durationMinutes is 0", () => {
    const clockInAt = new Date("2026-09-13T22:00:00.000Z");
    const now = new Date("2026-09-13T22:18:00.000Z");
    expect(resolveEntryMinutes(clockInAt, null, 0, now)).toBe(18);
    expect(resolveEntryMinutes(clockInAt, undefined, null, now)).toBe(18);
    expect(resolveEntryMinutes(clockInAt, new Date("2026-09-13T22:30:00.000Z"), 30, now)).toBe(30);
  });

  it("rounds hours to one decimal", () => {
    expect(hoursFromMinutes(90)).toBe(1.5);
    expect(hoursFromMinutes(6)).toBe(0.1);
  });

  it("formats a local calendar date", () => {
    expect(localDateString(new Date(2026, 8, 13))).toBe("2026-09-13");
  });

  it("treats a previous calendar date as an expired student session", () => {
    expect(isStudentSessionExpired("2026-09-13", "2026-09-14")).toBe(true);
    expect(isStudentSessionExpired("2026-09-14", "2026-09-14")).toBe(false);
    expect(isStudentSessionExpired(undefined, "2026-09-14")).toBe(false);
  });

  it("computes local midnight after a date", () => {
    const next = startOfNextLocalDay(new Date(2026, 8, 13, 22, 15));
    expect(localDateString(next)).toBe("2026-09-14");
    expect(next.getHours()).toBe(0);
    expect(msUntilNextLocalMidnight(new Date(2026, 8, 13, 23, 59, 0))).toBeGreaterThan(0);
    expect(msUntilNextLocalMidnight(new Date(2026, 8, 13, 23, 59, 0))).toBeLessThanOrEqual(60_000);
  });

  it("starts the local week on Monday", () => {
    expect(startOfLocalWeek(new Date(2026, 8, 13)).getDay()).toBe(1);
    expect(localDateString(startOfLocalWeek(new Date(2026, 8, 13)))).toBe("2026-09-07");
  });

  it("builds a Monday-Sunday local week range", () => {
    const week = localWeekRange(new Date(2026, 8, 13));
    expect(week.startDate).toBe("2026-09-07");
    expect(week.endDate).toBe("2026-09-13");
  });

  it("rejects clock-out before clock-in", () => {
    expect(assertClockRange(new Date("2026-09-13T14:00:00"), new Date("2026-09-13T13:00:00"))).toBeTruthy();
    expect(assertClockRange(new Date("2026-09-13T13:00:00"), new Date("2026-09-13T14:00:00"))).toBeNull();
  });

  it("formats a datetime-local value in local time", () => {
    const value = toDateTimeLocalValue(new Date(2026, 8, 13, 9, 5));
    expect(value).toBe("2026-09-13T09:05");
  });
});

describe("student portal request schemas", () => {
  it("requires a supervisor id", () => {
    expect(studentClockInRequestSchema.safeParse({ supervisorId: "tech-1" }).success).toBe(true);
    expect(studentClockInRequestSchema.safeParse({ supervisorId: "  " }).success).toBe(false);
    expect(studentClockInRequestSchema.safeParse({}).success).toBe(false);
  });

  it("requires both recap fields", () => {
    const valid = studentRecapRequestSchema.safeParse({
      whatIDid: "Helped replace a leaky faucet in the kitchen.",
      whatILearned: "How to shut off the water supply before loosening fittings.",
    });
    expect(valid.success).toBe(true);

    expect(
      studentRecapRequestSchema.safeParse({
        whatIDid: "short",
        whatILearned: "Also short",
      }).success,
    ).toBe(false);
  });

  it("requires a reason and valid times for student edit requests", () => {
    expect(
      studentTimeEditRequestSchema.safeParse({
        timeEntryId: "entry-1",
        requestedClockInAt: "2026-09-13T12:00:00.000Z",
        requestedClockOutAt: "2026-09-13T16:00:00.000Z",
        reason: "Forgot to clock out after the shift.",
      }).success,
    ).toBe(true);

    expect(
      studentTimeEditRequestSchema.safeParse({
        timeEntryId: "entry-1",
        requestedClockInAt: "not-a-date",
        reason: "Forgot to clock out after the shift.",
      }).success,
    ).toBe(false);

    expect(
      studentTimeEditRequestSchema.safeParse({
        timeEntryId: "entry-1",
        requestedClockInAt: "2026-09-13T12:00:00.000Z",
        reason: "short",
      }).success,
    ).toBe(false);
  });

  it("requires clock-in when an admin patches a time entry", () => {
    expect(
      adminStudentTimeEntryPatchSchema.safeParse({
        clockInAt: "2026-09-13T12:00:00.000Z",
        clockOutAt: "2026-09-13T15:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(adminStudentTimeEntryPatchSchema.safeParse({ clockOutAt: null }).success).toBe(false);
  });
});
