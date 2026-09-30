import { describe, expect, it } from "vitest";
import { driverCanBeSelected, driverHasContact, normalizeTripCode } from "../driverRoster";

describe("driver roster gate", () => {
  const driver = { status: "active", email: "a@campus.edu", phone: null };

  it("allows an active driver with contact and no penalty", () => {
    expect(driverCanBeSelected(driver, false)).toBe(true);
  });

  it("blocks a driver with an active penalty", () => {
    expect(driverCanBeSelected(driver, true)).toBe(false);
  });

  it("blocks a driver with no email or phone", () => {
    expect(driverHasContact({ email: "  ", phone: "" })).toBe(false);
    expect(driverCanBeSelected({ status: "active", email: "", phone: null }, false)).toBe(false);
  });

  it("normalizes a trip code", () => {
    expect(normalizeTripCode(" ab-12 ")).toBe("AB12");
  });
});
