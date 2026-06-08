export const MOBILE_EQUIPMENT_CATEGORIES = [
  { value: "mower", label: "Mower" },
  { value: "tractor", label: "Tractor" },
  { value: "pump", label: "Pump" },
  { value: "chainsaw", label: "Chainsaw" },
  { value: "weedeater", label: "Weedeater" },
  { value: "generator", label: "Generator" },
  { value: "trailer", label: "Trailer" },
  { value: "small_engine", label: "Small Engine" },
  { value: "other", label: "Other" },
] as const;

export const MOBILE_EQUIPMENT_STATUSES = [
  { value: "available", label: "Available" },
  { value: "in_use", label: "In Use" },
  { value: "needs_maintenance", label: "Needs Maintenance" },
  { value: "out_of_service", label: "Out of Service" },
] as const;

export function categoryLabel(value: string): string {
  return MOBILE_EQUIPMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function statusLabel(value: string): string {
  return MOBILE_EQUIPMENT_STATUSES.find((s) => s.value === value)?.label ?? value;
}
