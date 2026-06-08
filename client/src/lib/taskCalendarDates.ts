import { differenceInCalendarDays, format } from "date-fns";
import type { Task } from "@shared/schema";

export function toCalendarDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = date instanceof Date ? new Date(date) : new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(12, 0, 0, 0);
  return parsed;
}

export function getCalendarDateKey(date: Date | string | null | undefined): string | null {
  const calendarDate = toCalendarDate(date);
  return calendarDate ? format(calendarDate, "yyyy-MM-dd") : null;
}

export function getTaskDateSpan(task: Pick<Task, "initialDate" | "estimatedCompletionDate">): {
  start: Date | null;
  end: Date | null;
} {
  const initialDate = toCalendarDate(task.initialDate);
  const dueDate = toCalendarDate(task.estimatedCompletionDate);

  if (!initialDate && !dueDate) {
    return { start: null, end: null };
  }

  const first = initialDate ?? dueDate!;
  const second = dueDate ?? initialDate!;

  return first <= second
    ? { start: first, end: second }
    : { start: second, end: first };
}

export function taskCoversDate(task: Pick<Task, "initialDate" | "estimatedCompletionDate">, date: Date): boolean {
  const { start, end } = getTaskDateSpan(task);
  const day = toCalendarDate(date);
  return !!start && !!end && !!day && day >= start && day <= end;
}

export function getTaskActiveDateKeys(
  task: Pick<Task, "initialDate" | "estimatedCompletionDate">,
  visibleStart?: Date,
  visibleEnd?: Date,
): string[] {
  const { start, end } = getTaskDateSpan(task);
  if (!start || !end) return [];

  const rangeStart = visibleStart ? toCalendarDate(visibleStart)! : start;
  const rangeEnd = visibleEnd ? toCalendarDate(visibleEnd)! : end;
  const cursor = new Date(Math.max(start.getTime(), rangeStart.getTime()));
  const last = new Date(Math.min(end.getTime(), rangeEnd.getTime()));

  const dates: string[] = [];
  while (cursor <= last) {
    dates.push(format(cursor, "yyyy-MM-dd"));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export function getTaskReschedulePayload(
  task: Pick<Task, "initialDate" | "estimatedCompletionDate">,
  targetDate: Date,
): { initialDate?: string; estimatedCompletionDate?: string } | null {
  const target = toCalendarDate(targetDate);
  const initialDate = toCalendarDate(task.initialDate);
  const dueDate = toCalendarDate(task.estimatedCompletionDate);
  const anchorDate = dueDate ?? initialDate;

  if (!target || !anchorDate) return null;

  const deltaDays = differenceInCalendarDays(target, anchorDate);
  const shift = (date: Date) => {
    const shifted = new Date(date);
    shifted.setDate(shifted.getDate() + deltaDays);
    shifted.setHours(12, 0, 0, 0);
    return format(shifted, "yyyy-MM-dd'T'12:00:00");
  };

  return {
    ...(initialDate ? { initialDate: shift(initialDate) } : {}),
    ...(dueDate ? { estimatedCompletionDate: shift(dueDate) } : {}),
  };
}
