/** Natural alphanumeric sort for fleet vehicle IDs (e.g. V-2 before V-10). */
export function compareVehicleIds(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortVehiclesByVehicleId<T extends { vehicleId: string }>(vehicles: T[]): T[] {
  return [...vehicles].sort((a, b) => compareVehicleIds(a.vehicleId, b.vehicleId));
}
