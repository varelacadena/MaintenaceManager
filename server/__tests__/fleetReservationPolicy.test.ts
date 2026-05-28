import { describe, expect, it } from "vitest";
import { isFleetPrivilegedRole } from "../routeUtils";

describe("fleet reservation policy helpers", () => {
  it("identifies admin as the only privileged fleet role", () => {
    expect(isFleetPrivilegedRole("admin")).toBe(true);
    expect(isFleetPrivilegedRole("technician")).toBe(false);
    expect(isFleetPrivilegedRole("student")).toBe(false);
  });
});
