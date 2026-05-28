import { describe, expect, it } from "vitest";
import { isFleetPrivilegedRole } from "../routeUtils";

describe("fleet auth helpers", () => {
  it("isFleetPrivilegedRole matches admin only", () => {
    expect(isFleetPrivilegedRole("admin")).toBe(true);
    expect(isFleetPrivilegedRole("technician")).toBe(false);
    expect(isFleetPrivilegedRole("staff")).toBe(false);
    expect(isFleetPrivilegedRole("student")).toBe(false);
    expect(isFleetPrivilegedRole(undefined)).toBe(false);
  });
});
