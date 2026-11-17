import { describe, expect, it } from "vitest";
import {
  canManageEquipment,
  canManageFleet,
  canManageInventory,
  canManagePurchases,
  hasTechPermission,
} from "@shared/techPermissions";

describe("techPermissions", () => {
  it("admins always have all permissions", () => {
    const admin = { role: "admin" };
    expect(canManageEquipment(admin)).toBe(true);
    expect(canManageFleet(admin)).toBe(true);
    expect(canManageInventory(admin)).toBe(true);
    expect(canManagePurchases(admin)).toBe(true);
  });

  it("technicians need explicit flags", () => {
    const tech = { role: "technician" };
    expect(canManageEquipment(tech)).toBe(false);
    expect(canManageFleet(tech)).toBe(false);
    expect(canManageInventory(tech)).toBe(false);
    expect(canManagePurchases(tech)).toBe(false);

    const equipped = {
      role: "technician",
      canManageEquipment: true,
      canManageFleet: true,
      canManageInventory: true,
      canManagePurchases: true,
    };
    expect(canManageEquipment(equipped)).toBe(true);
    expect(canManageFleet(equipped)).toBe(true);
    expect(canManageInventory(equipped)).toBe(true);
    expect(canManagePurchases(equipped)).toBe(true);
  });

  it("hasTechPermission maps keys correctly", () => {
    const tech = { role: "technician", canManageInventory: true };
    expect(hasTechPermission(tech, "inventory")).toBe(true);
    expect(hasTechPermission(tech, "fleet")).toBe(false);
    expect(hasTechPermission({ role: "technician", canManagePurchases: true }, "purchases")).toBe(true);
  });
});
