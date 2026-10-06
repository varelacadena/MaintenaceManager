export const LIFE_SAFETY_CATEGORIES = ["smoke_detector", "exit_sign"] as const;

export type LifeSafetyCategory = (typeof LIFE_SAFETY_CATEGORIES)[number];

export type LifeSafetyResult = "pending" | "pass" | "problem";

const UUID_IN_TEXT =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function isLifeSafetyCategory(category: string | null | undefined): boolean {
  const key = category?.toLowerCase();
  return key === "smoke_detector" || key === "exit_sign";
}

export function lifeSafetyGroupLabel(category: string): string {
  return category.toLowerCase() === "exit_sign" ? "Exit signs" : "Smoke detectors";
}

export function lifeSafetyAction(category: string): string {
  return category.toLowerCase() === "exit_sign" ? "Confirm the sign is lit" : "Sound the alarm";
}

export function lifeSafetyPlace(spaceName?: string | null, floor?: string | null): string {
  const name = spaceName?.trim() ?? "";
  const level = floor?.trim() ?? "";
  if (name && level) return `${name} · ${level}`;
  if (name) return name;
  return "No room";
}

export function equipmentIdFromScan(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const pathMatch = trimmed.match(/\/equipment\/([0-9a-f-]{36})/i);
  if (pathMatch) return pathMatch[1];
  const uuidMatch = trimmed.match(UUID_IN_TEXT);
  return uuidMatch ? uuidMatch[1] : null;
}

function floorRank(floor: string | null | undefined): number {
  const value = floor?.trim().toLowerCase() ?? "";
  if (!value) return 500;
  if (value.includes("basement")) return 0;
  if (value.includes("ground")) return 1;
  const numberMatch = value.match(/\d+/);
  if (numberMatch) return parseInt(numberMatch[0], 10);
  return 400;
}

export type LifeSafetySortable = {
  category: string;
  spaceName?: string | null;
  floor?: string | null;
  equipmentName: string;
};

export function compareLifeSafetyItems(a: LifeSafetySortable, b: LifeSafetySortable): number {
  const categoryOrder = (category: string) => (category.toLowerCase() === "exit_sign" ? 1 : 0);
  const byCategory = categoryOrder(a.category) - categoryOrder(b.category);
  if (byCategory !== 0) return byCategory;
  const byFloor = floorRank(a.floor) - floorRank(b.floor);
  if (byFloor !== 0) return byFloor;
  const bySpace = (a.spaceName ?? "").localeCompare(b.spaceName ?? "", undefined, { sensitivity: "base" });
  if (bySpace !== 0) return bySpace;
  return a.equipmentName.localeCompare(b.equipmentName, undefined, { sensitivity: "base" });
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function lifeSafetyNextDue(initialDate: Date, intervalWeeks: number): Date {
  const weeks = Number.isFinite(intervalWeeks) && intervalWeeks > 0 ? intervalWeeks : 1;
  const next = new Date(initialDate);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

export function isLifeSafetyDue(nextDue: Date, now: Date): boolean {
  return startOfLocalDay(nextDue).getTime() <= startOfLocalDay(now).getTime();
}

export const LIFE_SAFETY_OPEN_MESSAGE =
  "Scan each smoke detector and exit sign, or mark a problem, before finishing.";

export const LIFE_SAFETY_DEFAULT_NAME = "Weekly life safety";

export const LIFE_SAFETY_DEFAULT_DESCRIPTION =
  "Sound each smoke detector alarm. Confirm each exit sign is lit. Scan the sticker on that unit.";
