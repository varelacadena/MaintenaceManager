/** Shop clock for every open interval. Eastern, including daylight saving. */
export const SHOP_TIME_ZONE = "America/New_York";

/** A task timer started before this hour stops the same day. Later starts stop the next day. */
export const TASK_TIMER_CUTOFF_HOUR = 18;

export const TASK_TIMER_AUTO_STOP_NOTE_PREFIX = "Timer stopped automatically";
export const TASK_TIMER_AUTO_STOP_NOTE = `${TASK_TIMER_AUTO_STOP_NOTE_PREFIX} at 6:00pm.`;

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function shopWallClock(date: Date, timeZone = SHOP_TIME_ZONE): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const hour = value("hour");
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: hour === 24 ? 0 : hour,
    minute: value("minute"),
    second: value("second"),
  };
}

/** A shop-local date and time as an absolute instant. */
export function shopDateTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  timeZone = SHOP_TIME_ZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetAt = (instant: number) => {
    const wall = shopWallClock(new Date(instant), timeZone);
    const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
    return asUtc - instant;
  };
  let instant = utcGuess - offsetAt(utcGuess);
  const corrected = utcGuess - offsetAt(instant);
  if (corrected !== instant) instant = corrected;
  return new Date(instant);
}

function addCalendarDays(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function sameShopDayAt(startedAt: Date, hour: number, minute = 0, timeZone = SHOP_TIME_ZONE): Date {
  const wall = shopWallClock(startedAt, timeZone);
  return shopDateTime(wall.year, wall.month, wall.day, hour, minute, timeZone);
}

/**
 * When a running task timer is scheduled to stop.
 * Started before 6:00pm: that day at 6:00pm. Started at or after 6:00pm: the next day at 6:00pm.
 */
export function taskTimerEndAt(startedAt: Date, timeZone = SHOP_TIME_ZONE): Date {
  const sameDay = sameShopDayAt(startedAt, TASK_TIMER_CUTOFF_HOUR, 0, timeZone);
  if (startedAt.getTime() < sameDay.getTime()) return sameDay;
  const wall = shopWallClock(startedAt, timeZone);
  const next = addCalendarDays(wall.year, wall.month, wall.day, 1);
  return shopDateTime(next.year, next.month, next.day, TASK_TIMER_CUTOFF_HOUR, 0, timeZone);
}

/** Shop midnight that starts the day after the clock-in. */
export function studentShiftEndAt(startedAt: Date, timeZone = SHOP_TIME_ZONE): Date {
  const wall = shopWallClock(startedAt, timeZone);
  const next = addCalendarDays(wall.year, wall.month, wall.day, 1);
  return shopDateTime(next.year, next.month, next.day, 0, 0, timeZone);
}

/** The scheduled end once `now` has reached it. Still open intervals return null. */
export function dueCutoff(endAt: Date, now: Date): Date | null {
  if (!Number.isFinite(endAt.getTime()) || !Number.isFinite(now.getTime())) return null;
  return now.getTime() >= endAt.getTime() ? endAt : null;
}

export function taskTimerCutoff(startedAt: Date, now: Date): Date | null {
  if (!Number.isFinite(startedAt.getTime())) return null;
  return dueCutoff(taskTimerEndAt(startedAt), now);
}

export function studentShiftCutoff(startedAt: Date, now: Date): Date | null {
  if (!Number.isFinite(startedAt.getTime())) return null;
  return dueCutoff(studentShiftEndAt(startedAt), now);
}

/** Earlier of now and a scheduled end, so a live clock stops on the cutoff. */
export function cappedInstant(now: Date | number, endAt: Date): Date {
  const nowMs = now instanceof Date ? now.getTime() : now;
  return new Date(Math.min(nowMs, endAt.getTime()));
}
