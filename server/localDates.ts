export type DateBasis = "active" | "completed" | "due" | "created";

/** Calendar dates are local days. `YYYY-MM-DD` must not be read as UTC midnight. */
export function parseLocalDayStart(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
}

export function parseLocalDayEnd(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
}

/** One id, or several ids joined with commas. */
export function parseCsvIds(value?: string | null): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
}

/** One building, or several buildings joined with commas in the property filter. */
export function parsePropertyIds(value?: string | null): string[] {
  return parseCsvIds(value);
}

export function parseDateBasis(value: unknown): DateBasis {
  if (value === "completed" || value === "due" || value === "created" || value === "active") return value;
  return "active";
}

export const DATE_BASIS_LABEL: Record<DateBasis, string> = {
  active: "Active in the period",
  completed: "Completed in the period",
  due: "Due in the period",
  created: "Created in the period",
};
