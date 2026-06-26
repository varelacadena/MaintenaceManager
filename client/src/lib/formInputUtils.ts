/**
 * Parse a controlled number input value. Empty input returns undefined so the
 * field can be cleared while the user types a new value.
 */
export function parseIntInput(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

/** Same as parseIntInput but for decimal fields. */
export function parseFloatInput(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
}
