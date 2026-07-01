export function minutesToHoursInputValue(minutes: number): string {
  if (!minutes) return "0";
  return String(Number((minutes / 60).toFixed(2)));
}

export function parseHoursToMinutes(hoursValue: string): number {
  const hours = parseFloat(hoursValue);
  if (Number.isNaN(hours) || hours < 0) return 0;
  return Math.round(hours * 60);
}
