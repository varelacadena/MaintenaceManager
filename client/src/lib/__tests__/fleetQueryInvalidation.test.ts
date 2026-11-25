import { describe, expect, it } from "vitest";
import { isCheckoutRefreshQueryKey } from "../fleetQueryInvalidation";

describe("isCheckoutRefreshQueryKey", () => {
  it("includes the vehicle, the reservation, and the dashboard count", () => {
    expect(isCheckoutRefreshQueryKey(["/api/vehicles/vehicle-1"])).toBe(true);
    expect(isCheckoutRefreshQueryKey(["/api/vehicle-reservations/res-1"])).toBe(true);
    expect(isCheckoutRefreshQueryKey(["/api/vehicle-checkout-logs"])).toBe(true);
    expect(isCheckoutRefreshQueryKey(["/api/dashboard"])).toBe(true);
  });

  it("leaves unrelated screens alone", () => {
    expect(isCheckoutRefreshQueryKey(["/api/purchases"])).toBe(false);
    expect(isCheckoutRefreshQueryKey(["/api/student/time-clock"])).toBe(false);
  });
});
