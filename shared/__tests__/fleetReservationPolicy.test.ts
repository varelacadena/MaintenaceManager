import { describe, expect, it } from "vitest";
import {
  checkInManualVehicleStatus,
  validateReservationStatusTransition,
} from "../fleetReservationPolicy";

describe("fleetReservationPolicy", () => {
  describe("validateReservationStatusTransition", () => {
    it("allows owner to cancel", () => {
      expect(
        validateReservationStatusTransition("approved", "cancelled", {
          isPrivileged: false,
          isOwner: true,
        }),
      ).toBeNull();
    });

    it("blocks owner from approving", () => {
      expect(
        validateReservationStatusTransition("pending", "approved", {
          isPrivileged: false,
          isOwner: true,
        }),
      ).toMatch(/only cancel/i);
    });

    it("blocks privileged active via patch", () => {
      expect(
        validateReservationStatusTransition("approved", "active", {
          isPrivileged: true,
          isOwner: false,
        }),
      ).toMatch(/checkout/i);
    });

    it("allows privileged approve from pending", () => {
      expect(
        validateReservationStatusTransition("pending", "approved", {
          isPrivileged: true,
          isOwner: false,
        }),
      ).toBeNull();
    });
  });

  describe("checkInManualVehicleStatus", () => {
    it("prioritizes maintenance over cleaning", () => {
      expect(
        checkInManualVehicleStatus({ hasIssues: true, needsCleaning: true }),
      ).toBe("needs_maintenance");
    });
  });
});
