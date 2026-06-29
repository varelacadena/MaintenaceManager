import { describe, expect, it } from "vitest";
import {
  isFleetPrivilegedRole,
  parseFleetUrlState,
  buildFleetLocationSearch,
  clampPageIndex,
} from "../fleetUtils";

describe("fleetUtils", () => {
  describe("isFleetPrivilegedRole", () => {
    it("allows admins", () => {
      expect(isFleetPrivilegedRole({ role: "admin" })).toBe(true);
    });

    it("allows technicians with fleet permission", () => {
      expect(isFleetPrivilegedRole({ role: "technician", canManageFleet: true })).toBe(true);
      expect(isFleetPrivilegedRole({ role: "technician" })).toBe(false);
    });

    it("denies other roles", () => {
      expect(isFleetPrivilegedRole({ role: "staff" })).toBe(false);
      expect(isFleetPrivilegedRole({ role: "student" })).toBe(false);
      expect(isFleetPrivilegedRole(undefined)).toBe(false);
    });
  });

  describe("parseFleetUrlState", () => {
    it("returns defaults for empty search", () => {
      expect(parseFleetUrlState("")).toEqual({
        tab: "fleet",
        fleetStatus: "all",
        fleetPage: 0,
        fleetSearch: "",
        resStatus: "pending_and_review",
        resPage: 0,
        resSearch: "",
      });
    });
  });

  describe("buildFleetLocationSearch", () => {
    it("omits default values", () => {
      expect(buildFleetLocationSearch(parseFleetUrlState(""))).toBe("");
    });
  });

  describe("clampPageIndex", () => {
    it("clamps within valid range", () => {
      expect(clampPageIndex(5, 50, 10)).toBe(4);
      expect(clampPageIndex(0, 0, 10)).toBe(0);
    });
  });
});
