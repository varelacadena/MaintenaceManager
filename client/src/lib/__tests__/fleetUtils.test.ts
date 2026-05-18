import { describe, expect, it } from "vitest";
import {
  isFleetPrivilegedRole,
  parseOptionalInt,
  reservationsListUrl,
  vehiclesListUrl,
} from "../fleetUtils";

describe("fleetUtils", () => {
  describe("isFleetPrivilegedRole", () => {
    it("returns true for admin and technician", () => {
      expect(isFleetPrivilegedRole("admin")).toBe(true);
      expect(isFleetPrivilegedRole("technician")).toBe(true);
    });

    it("returns false for other roles", () => {
      expect(isFleetPrivilegedRole("staff")).toBe(false);
      expect(isFleetPrivilegedRole("student")).toBe(false);
      expect(isFleetPrivilegedRole(undefined)).toBe(false);
    });
  });

  describe("vehiclesListUrl", () => {
    it("includes pagination params by default", () => {
      expect(vehiclesListUrl("all", 0)).toBe("/api/vehicles?limit=24&offset=0");
    });

    it("encodes status and page offset", () => {
      expect(vehiclesListUrl("in_use", 2)).toBe("/api/vehicles?limit=24&offset=48&status=in_use");
    });

    it("omits pagination when disabled", () => {
      expect(vehiclesListUrl("all", 0, 24, false)).toBe("/api/vehicles");
    });
  });

  describe("reservationsListUrl", () => {
    it("maps composite filters to statuses query with pagination", () => {
      expect(reservationsListUrl("pending_and_review")).toContain("statuses=pending%2Cpending_review");
      expect(reservationsListUrl("pending_and_review")).toContain("limit=20");
    });

    it("uses single status param for concrete status", () => {
      expect(reservationsListUrl("pending")).toContain("status=pending");
    });
  });

  describe("parseOptionalInt", () => {
    it("parses valid integers", () => {
      expect(parseOptionalInt("42", 0)).toBe(42);
    });

    it("returns fallback for invalid input", () => {
      expect(parseOptionalInt("", 2024)).toBe(2024);
      expect(parseOptionalInt("abc", 5)).toBe(5);
    });
  });
});
