import { describe, expect, it } from "vitest";
import { isFleetPrivilegedRole } from "../routeUtils";

describe("fleet auth helpers", () => {
  it("isFleetPrivilegedRole matches admin and technician only", () => {
    expect(isFleetPrivilegedRole("admin")).toBe(true);
    expect(isFleetPrivilegedRole("technician")).toBe(true);
    expect(isFleetPrivilegedRole("staff")).toBe(false);
    expect(isFleetPrivilegedRole("student")).toBe(false);
    expect(isFleetPrivilegedRole(undefined)).toBe(false);
  });
});
