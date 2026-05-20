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

  it("canOperateInventory allows admin and technician only", () => {
    expect(canOperateInventory("admin")).toBe(true);
    expect(canOperateInventory("technician")).toBe(true);
    expect(canOperateInventory("student")).toBe(false);
  });

  it("canSeeInventoryCost is admin-only", () => {
    expect(canSeeInventoryCost("admin")).toBe(true);
    expect(canSeeInventoryCost("technician")).toBe(false);
  });

  it("isInventoryAdmin", () => {
    expect(isInventoryAdmin("admin")).toBe(true);
    expect(isInventoryAdmin("technician")).toBe(false);
  });
});
