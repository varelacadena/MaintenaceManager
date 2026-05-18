import { describe, expect, it } from "vitest";
import { isFleetPrivilegedRole } from "../routeUtils";

describe("fleet reservation policy helpers", () => {
  it("identifies privileged fleet roles", () => {
    expect(isFleetPrivilegedRole("admin")).toBe(true);
    expect(isFleetPrivilegedRole("technician")).toBe(true);
    expect(isFleetPrivilegedRole("student")).toBe(false);
  });
});
