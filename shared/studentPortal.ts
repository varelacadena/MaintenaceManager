import { z } from "zod";

export const MIN_RECAP_LENGTH = 8;
export const MAX_RECAP_LENGTH = 4000;
export const MIN_TIME_EDIT_REASON = 8;
export const MAX_TIME_EDIT_REASON = 1000;

export const studentClockInRequestSchema = z.object({
  supervisorId: z.string().trim().min(1, "Select your supervisor"),
});

export const studentRecapRequestSchema = z.object({
  whatIDid: z
    .string()
    .trim()
    .min(MIN_RECAP_LENGTH, `Write at least ${MIN_RECAP_LENGTH} characters about what you did`)
    .max(MAX_RECAP_LENGTH),
  whatILearned: z
    .string()
    .trim()
    .min(MIN_RECAP_LENGTH, `Write at least ${MIN_RECAP_LENGTH} characters about what you learned`)
    .max(MAX_RECAP_LENGTH),
  recapDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional(),
});

const isoTimestamp = z
  .string()
  .trim()
  .min(1, "Enter a date and time")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date and time");

export const studentTimeEditRequestSchema = z.object({
  timeEntryId: z.string().trim().min(1, "Choose a time entry"),
  requestedClockInAt: isoTimestamp,
  requestedClockOutAt: z.union([isoTimestamp, z.null()]).optional(),
  reason: z
    .string()
    .trim()
    .min(MIN_TIME_EDIT_REASON, `Explain the change in at least ${MIN_TIME_EDIT_REASON} characters`)
    .max(MAX_TIME_EDIT_REASON),
});

export const adminStudentTimeEntryPatchSchema = z.object({
  clockInAt: isoTimestamp,
  clockOutAt: z.union([isoTimestamp, z.null()]).optional(),
});

export const adminStudentTimeEntryCreateSchema = z.object({
  supervisorId: z.string().trim().min(1, "Select a supervisor"),
  clockInAt: isoTimestamp,
  clockOutAt: z.union([isoTimestamp, z.null()]).optional(),
});

export const adminTimeEditReviewSchema = z.object({
  status: z.enum(["approved", "denied"]),
  adminNote: z.string().trim().max(MAX_TIME_EDIT_REASON).optional(),
  clockInAt: isoTimestamp.optional(),
  clockOutAt: z.union([isoTimestamp, z.null()]).optional(),
});

export type StudentClockInRequest = z.infer<typeof studentClockInRequestSchema>;
export type StudentRecapRequest = z.infer<typeof studentRecapRequestSchema>;
export type StudentTimeEditRequest = z.infer<typeof studentTimeEditRequestSchema>;
export type AdminStudentTimeEntryPatch = z.infer<typeof adminStudentTimeEntryPatchSchema>;
export type AdminStudentTimeEntryCreate = z.infer<typeof adminStudentTimeEntryCreateSchema>;
export type AdminTimeEditReview = z.infer<typeof adminTimeEditReviewSchema>;

export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local midnight that starts the calendar day after `date`. */
export function startOfNextLocalDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function msUntilNextLocalMidnight(now: Date = new Date()): number {
  return Math.max(1, startOfNextLocalDay(now).getTime() - now.getTime());
}

export function isStudentSessionExpired(
  sessionDate: string | null | undefined,
  today = localDateString(),
): boolean {
  return Boolean(sessionDate) && sessionDate !== today;
}

export function computeDurationMinutes(clockInAt: Date, clockOutAt: Date = new Date()): number {
  const minutes = Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000);
  return Math.max(0, minutes);
}

export function elapsedMilliseconds(
  clockInAt: Date | string | null | undefined,
  now: Date | number = Date.now(),
): number {
  if (!clockInAt) return 0;
  const start = clockInAt instanceof Date ? clockInAt : new Date(clockInAt);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, new Date(now).getTime() - start.getTime());
}

/** Recorded time as hours and minutes, e.g. `2h 30m` or `0h 12m`. */
export function formatDurationMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/** Running clock as hours, minutes, and seconds, e.g. `0h 00m 12s`. */
export function formatLiveDuration(totalMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, totalMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

/** Closed week minutes plus live elapsed from an open clock-in. */
export function weekDurationMs(
  closedWeekMinutes: number,
  openClockInAt: Date | string | null | undefined,
  now: Date | number = Date.now(),
): number {
  return Math.max(0, closedWeekMinutes) * 60_000 + elapsedMilliseconds(openClockInAt, now);
}

export function hoursFromMinutes(totalMinutes: number): number {
  return Math.round((Math.max(0, totalMinutes) / 60) * 10) / 10;
}

export function toDateTimeLocalValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function dateTimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function startOfLocalWeek(date: Date = new Date()): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

export function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return next;
}

export function localWeekRange(anchor: Date = new Date()): {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
} {
  const start = startOfLocalWeek(anchor);
  const end = addLocalDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { start, end, startDate: localDateString(start), endDate: localDateString(end) };
}

export function parseLocalDate(value: string | undefined | null, fallback: Date = new Date()): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return fallback;
}

export function formatWeekLabel(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const startFmt = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endFmt = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startFmt} – ${endFmt}`;
}

export function weekdayLabel(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, { weekday: "short" });
}

export function resolveEntryMinutes(
  clockInAt: Date | string | null | undefined,
  clockOutAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
  now: Date = new Date(),
): number {
  const isOpen = clockOutAt == null || clockOutAt === "";
  if (!isOpen && durationMinutes != null) return Math.max(0, durationMinutes);
  if (!clockInAt) return 0;
  const start = clockInAt instanceof Date ? clockInAt : new Date(clockInAt);
  if (Number.isNaN(start.getTime())) return 0;
  const end = !isOpen
    ? clockOutAt instanceof Date
      ? clockOutAt
      : new Date(clockOutAt)
    : now;
  if (Number.isNaN(end.getTime())) return 0;
  return computeDurationMinutes(start, end);
}

export function assertClockRange(clockInAt: Date, clockOutAt: Date | null): string | null {
  if (clockOutAt && clockOutAt.getTime() < clockInAt.getTime()) {
    return "Clock out must be after clock in";
  }
  return null;
}
