import { describe, expect, it } from "vitest";
import {
  computeSyncedVehicleStatus,
  vehicleReservationRangesOverlap,
} from "../fleetStatus";

describe("computeSyncedVehicleStatus", () => {
  it("preserves manual maintenance statuses", () => {
    expect(
      computeSyncedVehicleStatus("needs_maintenance", false, ["pending"]),
    ).toBeNull();
    expect(
      computeSyncedVehicleStatus("out_of_service", true, ["active"]),
    ).toBeNull();
  });

  it("sets in_use when there is an active checkout", () => {
    expect(computeSyncedVehicleStatus("available", true, [])).toBe("in_use");
    expect(computeSyncedVehicleStatus("in_use", true, [])).toBeNull();
  });

  it("sets in_use for active or pending_review reservations without checkout", () => {
    expect(computeSyncedVehicleStatus("reserved", false, ["active"])).toBe("in_use");
    expect(
      computeSyncedVehicleStatus("available", false, ["pending_review"]),
    ).toBe("in_use");
  });

  it("sets reserved for pending or approved reservations", () => {
    expect(computeSyncedVehicleStatus("available", false, ["pending"])).toBe(
      "reserved",
    );
    expect(computeSyncedVehicleStatus("available", false, ["approved"])).toBe(
      "reserved",
    );
    expect(computeSyncedVehicleStatus("reserved", false, ["approved"])).toBeNull();
  });

  it("sets available when no open trips or upcoming reservations", () => {
    expect(computeSyncedVehicleStatus("reserved", false, ["completed"])).toBe(
      "available",
    );
    expect(computeSyncedVehicleStatus("available", false, ["cancelled"])).toBeNull();
  });

  it("prefers active checkout over reservation state", () => {
    expect(
      computeSyncedVehicleStatus("available", true, ["pending"]),
    ).toBe("in_use");
  });
});

describe("vehicleReservationRangesOverlap", () => {
  it("detects overlapping ranges", () => {
    const aStart = new Date("2026-05-01T09:00:00");
    const aEnd = new Date("2026-05-01T17:00:00");
    const bStart = new Date("2026-05-01T12:00:00");
    const bEnd = new Date("2026-05-01T18:00:00");
    expect(vehicleReservationRangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(true);
  });

  it("returns false for non-overlapping ranges", () => {
    const aStart = new Date("2026-05-01T09:00:00");
    const aEnd = new Date("2026-05-01T11:00:00");
    const bStart = new Date("2026-05-01T12:00:00");
    const bEnd = new Date("2026-05-01T14:00:00");
    expect(vehicleReservationRangesOverlap(aStart, aEnd, bStart, bEnd)).toBe(false);
  });
});
