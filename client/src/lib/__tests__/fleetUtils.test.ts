import { describe, expect, it } from "vitest";
import {
  isFleetPrivilegedRole,
  parseOptionalInt,
  reservationsListUrl,
  vehiclesListUrl,
  vehiclesPickerListUrl,
  clampPageIndex,
  buildMyReservationsLocationSearch,
  parseMyReservationsUrlState,
} from "../fleetUtils";

describe("fleetUtils", () => {
  describe("isFleetPrivilegedRole", () => {
    it("returns true for admin only", () => {
      expect(isFleetPrivilegedRole("admin")).toBe(true);
      expect(isFleetPrivilegedRole("technician")).toBe(false);
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

    it("includes server-side search", () => {
      expect(vehiclesListUrl("all", 0, 24, "ford")).toContain("search=ford");
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

  describe("vehiclesPickerListUrl", () => {
    it("requests a large first page for pickers", () => {
      expect(vehiclesPickerListUrl()).toContain("limit=200");
    });
  });

  describe("clampPageIndex", () => {
    it("clamps page when total shrinks", () => {
      expect(clampPageIndex(5, 30, 15)).toBe(1);
      expect(clampPageIndex(0, 0, 15)).toBe(0);
    });
  });

  describe("my reservations URL state", () => {
    it("round-trips page in search string", () => {
      expect(parseMyReservationsUrlState("?page=2").page).toBe(2);
      expect(buildMyReservationsLocationSearch(2)).toBe("?page=2");
      expect(buildMyReservationsLocationSearch(0)).toBe("");
    });
  });
});
