import { describe, expect, it } from "vitest";
import {
  SHOP_TIME_ZONE,
  cappedInstant,
  shopDateTime,
  shopWallClock,
  studentShiftCutoff,
  studentShiftEndAt,
  taskTimerCutoff,
  taskTimerEndAt,
} from "../openIntervals";

function wall(date: Date) {
  const parts = shopWallClock(date, SHOP_TIME_ZONE);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

describe("shop clock", () => {
  it("builds 6:00pm Eastern in winter and summer", () => {
    expect(shopDateTime(2026, 11, 21, 18, 0).toISOString()).toBe("2026-11-21T23:00:00.000Z");
    expect(shopDateTime(2026, 7, 15, 18, 0).toISOString()).toBe("2026-07-15T22:00:00.000Z");
    expect(wall(shopDateTime(2026, 11, 21, 18, 0))).toBe("2026-11-21 18:00");
  });
});

describe("task timer cutoff", () => {
  const started = new Date("2026-11-21T21:00:00.000Z"); // 4:00pm EST
  const sixPm = new Date("2026-11-21T23:00:00.000Z");

  it("keeps a daytime timer open until 6:00pm", () => {
    expect(taskTimerEndAt(started).toISOString()).toBe(sixPm.toISOString());
    expect(taskTimerCutoff(started, new Date("2026-11-21T22:59:00.000Z"))).toBeNull();
    expect(taskTimerCutoff(started, sixPm)?.toISOString()).toBe(sixPm.toISOString());
  });

  it("backdates a timer left running overnight to 6:00pm on the day it started", () => {
    const nextMorning = new Date("2026-11-22T14:00:00.000Z");
    expect(taskTimerCutoff(started, nextMorning)?.toISOString()).toBe(sixPm.toISOString());
  });

  it("lets a timer started at or after 6:00pm run until 6:00pm the next day", () => {
    const evening = new Date("2026-11-22T00:00:00.000Z"); // 7:00pm EST on the 21st
    const nextSix = new Date("2026-11-22T23:00:00.000Z");
    expect(taskTimerCutoff(evening, new Date("2026-11-22T02:00:00.000Z"))).toBeNull();
    expect(taskTimerCutoff(evening, nextSix)?.toISOString()).toBe(nextSix.toISOString());
    expect(taskTimerEndAt(sixPm).toISOString()).toBe(nextSix.toISOString());
  });

  it("uses daylight saving for a summer shift", () => {
    const afternoon = new Date("2026-07-15T19:00:00.000Z"); // 3:00pm EDT
    expect(taskTimerEndAt(afternoon).toISOString()).toBe("2026-07-15T22:00:00.000Z");
  });
});

describe("student shift cutoff", () => {
  const clockIn = new Date("2026-11-21T15:00:00.000Z"); // 10:00am EST
  const midnight = new Date("2026-11-22T05:00:00.000Z");

  it("ends the shift at the next shop midnight", () => {
    expect(studentShiftEndAt(clockIn).toISOString()).toBe(midnight.toISOString());
    expect(studentShiftCutoff(clockIn, new Date("2026-11-22T04:59:00.000Z"))).toBeNull();
    expect(studentShiftCutoff(clockIn, new Date("2026-11-22T15:00:00.000Z"))?.toISOString()).toBe(
      midnight.toISOString(),
    );
  });

  it("caps a live instant at the scheduled end", () => {
    const later = new Date("2026-11-22T12:00:00.000Z");
    expect(cappedInstant(later, midnight).toISOString()).toBe(midnight.toISOString());
    expect(cappedInstant(clockIn, midnight).toISOString()).toBe(clockIn.toISOString());
  });
});
