/** Statuses that grant vehicle detail access for non-privileged users. */
export const VEHICLE_ACCESS_RESERVATION_STATUSES = [
  "pending",
  "approved",
  "active",
  "pending_review",
] as const;

export const CHECKOUT_OPEN_LEAD_MS = 60 * 60 * 1000;

export function getCheckoutOpenTime(startDate: string | Date): Date {
  return new Date(new Date(startDate).getTime() - CHECKOUT_OPEN_LEAD_MS);
}

export function isCheckoutWindowOpen(
  startDate: string | Date,
  now: Date = new Date(),
): boolean {
  return now >= getCheckoutOpenTime(startDate);
}

export function isReservationCheckoutAllowed(
  reservation: { status: string; startDate: string | Date; endDate: string | Date },
  now: Date = new Date(),
): boolean {
  return reservation.status === "approved" &&
    isCheckoutWindowOpen(reservation.startDate, now) &&
    now <= new Date(reservation.endDate);
}

type ReservationStatus =
  | "pending"
  | "approved"
  | "active"
  | "pending_review"
  | "completed"
  | "cancelled";

const PRIVILEGED_PATCH_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["approved", "cancelled"],
  approved: ["cancelled", "pending"],
  active: ["cancelled"],
  pending_review: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Returns an error message if the transition is not allowed. */
export function validateReservationStatusTransition(
  currentStatus: string,
  nextStatus: string,
  options: { isPrivileged: boolean; isOwner: boolean },
): string | null {
  if (currentStatus === nextStatus) return null;

  if (!options.isPrivileged) {
    if (nextStatus !== "cancelled") {
      return "You can only cancel your reservation";
    }
    if (!options.isOwner) {
      return "Forbidden";
    }
    return null;
  }

  if (nextStatus === "active") {
    return "Use the checkout flow to mark a reservation active";
  }
  if (nextStatus === "pending_review") {
    return "Use the check-in flow to submit a trip for review";
  }

  const allowed = PRIVILEGED_PATCH_TRANSITIONS[currentStatus as ReservationStatus];
  if (!allowed) {
    return `Invalid current status: ${currentStatus}`;
  }
  if (!allowed.includes(nextStatus as ReservationStatus)) {
    return `Cannot change reservation from ${currentStatus} to ${nextStatus}`;
  }

  if (nextStatus === "approved" && currentStatus === "pending") {
    return null;
  }

  return null;
}

/** Status allowed when privileged staff create a reservation on behalf of someone. */
export function normalizePrivilegedCreateStatus(
  requested: string | undefined,
): ReservationStatus {
  if (requested === "approved") return "approved";
  return "pending";
}

export type CheckInVehicleCondition = {
  hasIssues: boolean;
  needsCleaning: boolean;
};

/** Manual vehicle status after check-in when not using sync alone. */
export function checkInManualVehicleStatus(
  condition: CheckInVehicleCondition,
): "needs_maintenance" | "needs_cleaning" | null {
  if (condition.hasIssues) return "needs_maintenance";
  if (condition.needsCleaning) return "needs_cleaning";
  return null;
}

export function isLowFuelLevel(fuelLevel: string | null | undefined): boolean {
  return fuelLevel === "empty" || fuelLevel === "1/4";
}

export function requiresCheckInReview(condition: {
  hasIssues: boolean;
  needsCleaning: boolean;
  fuelLevel?: string | null;
}): boolean {
  return condition.hasIssues || condition.needsCleaning || isLowFuelLevel(condition.fuelLevel);
}
