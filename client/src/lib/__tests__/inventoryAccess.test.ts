import { describe, expect, it } from "vitest";
import {
  canReadInventory,
  canOperateInventory,
  canSeeInventoryCost,
  isInventoryAdmin,
} from "../inventoryAccess";

describe("inventoryAccess", () => {
  it("canReadInventory allows admin, technician, student", () => {
    expect(canReadInventory("admin")).toBe(true);
    expect(canReadInventory("technician")).toBe(true);
    expect(canReadInventory("student")).toBe(true);
    expect(canReadInventory("staff")).toBe(false);
  });

  it("canOperateInventory allows admin and permitted technicians", () => {
    expect(canOperateInventory({ role: "admin" })).toBe(true);
    expect(canOperateInventory({ role: "technician" })).toBe(false);
    expect(canOperateInventory({ role: "technician", canManageInventory: true })).toBe(true);
    expect(canOperateInventory({ role: "student" })).toBe(false);
  });

  it("canSeeInventoryCost is admin-only", () => {
    expect(canSeeInventoryCost("admin")).toBe(true);
    expect(canSeeInventoryCost("technician")).toBe(false);
  });

  it("isInventoryAdmin", () => {
    expect(isInventoryAdmin({ role: "admin" })).toBe(true);
    expect(isInventoryAdmin({ role: "technician", canManageInventory: true })).toBe(true);
    expect(isInventoryAdmin({ role: "technician" })).toBe(false);
  });
});
