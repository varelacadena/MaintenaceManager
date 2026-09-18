export function minutesToHoursInputValue(minutes: number): string {
  if (!minutes) return "0";
  return String(Number((minutes / 60).toFixed(2)));
}

export function parseHoursToMinutes(hoursValue: string): number {
  const hours = parseFloat(hoursValue);
  if (Number.isNaN(hours) || hours < 0) return 0;
  return Math.round(hours * 60);
}

export function durationFromHoursAndMinutes(hoursValue: string, minutesValue: string): number {
  const hours = parseInt(hoursValue || "0", 10);
  const minutes = parseInt(minutesValue || "0", 10);
  if (Number.isNaN(hours) || hours < 0) return 0;
  if (Number.isNaN(minutes) || minutes < 0) return 0;
  return hours * 60 + minutes;
}

export function splitMinutes(totalMinutes: number): { hours: string; minutes: string } {
  const safe = Math.max(0, Math.round(totalMinutes || 0));
  return {
    hours: String(Math.floor(safe / 60)),
    minutes: String(safe % 60),
  };
}

export function buildManualTimeEntryRange(
  durationMinutes: number,
  workedOn: string,
  now: Date = new Date(),
): { startTime: Date; endTime: Date } {
  const [year, month, day] = workedOn.split("-").map(Number);
  const hasDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day);
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = !hasDate || workedOn === todayKey;
  const endTime = isToday
    ? new Date(now)
    : new Date(year, month - 1, day, 17, 0, 0, 0);
  const startTime = new Date(endTime.getTime() - Math.max(0, durationMinutes) * 60_000);
  return { startTime, endTime };
}
