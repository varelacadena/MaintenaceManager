/** Vehicle statuses set manually by staff; sync must not override these. */
export const MANUAL_VEHICLE_STATUSES = [
  "needs_maintenance",
  "needs_cleaning",
  "out_of_service",
] as const;

export type ManualVehicleStatus = (typeof MANUAL_VEHICLE_STATUSES)[number];

export type SyncableVehicleStatus =
  | "available"
  | "reserved"
  | "in_use"
  | ManualVehicleStatus;

/**
 * Computes the vehicle status after syncing reservations and trip logs.
 * Returns null when the current status should be preserved (manual hold or already correct).
 */
export function computeSyncedVehicleStatus(
  currentStatus: string,
  hasActiveCheckOut: boolean,
  reservationStatuses: string[],
): SyncableVehicleStatus | null {
  if ((MANUAL_VEHICLE_STATUSES as readonly string[]).includes(currentStatus)) {
    return null;
  }

  if (hasActiveCheckOut) {
    return currentStatus !== "in_use" ? "in_use" : null;
  }

  const hasOpenTrip = reservationStatuses.some(
    (s) => s === "active" || s === "pending_review",
  );
  if (hasOpenTrip) {
    return currentStatus !== "in_use" ? "in_use" : null;
  }

  const hasUpcomingReservation = reservationStatuses.some(
    (s) => s === "pending" || s === "approved",
  );
  if (hasUpcomingReservation) {
    return currentStatus !== "reserved" ? "reserved" : null;
  }

  return currentStatus !== "available" ? "available" : null;
}

/** True when two date ranges overlap (inclusive). */
export function vehicleReservationRangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() <= bEnd.getTime() && aEnd.getTime() >= bStart.getTime();
}
