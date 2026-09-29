import { format } from "date-fns";

const ISO_DATE_PART_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function toCalendarDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  if (typeof date === "string") {
    const datePart = ISO_DATE_PART_RE.exec(date);
    if (datePart) {
      const [, year, month, day] = datePart;
      return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    }
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(12, 0, 0, 0);
  return parsed;
}

export function getCalendarDateKey(date: Date | string | null | undefined): string | null {
  const calendarDate = toCalendarDate(date);
  return calendarDate ? format(calendarDate, "yyyy-MM-dd") : null;
}

export function getTaskDateInputValue(date: Date | string | null | undefined): string {
  return getCalendarDateKey(date) ?? "";
}

export function dateInputValueToTaskTimestamp(value: string): string {
  return `${value}T12:00:00`;
}

export function dateInputValuePreservingTime(
  value: string,
  existing: Date | string | null | undefined,
): string {
  if (!existing) return dateInputValueToTaskTimestamp(value);
  const previous = new Date(existing);
  if (Number.isNaN(previous.getTime())) return dateInputValueToTaskTimestamp(value);
  const hours = String(previous.getHours()).padStart(2, "0");
  const minutes = String(previous.getMinutes()).padStart(2, "0");
  const seconds = String(previous.getSeconds()).padStart(2, "0");
  return `${value}T${hours}:${minutes}:${seconds}`;
}
