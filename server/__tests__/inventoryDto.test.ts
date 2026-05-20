import { describe, expect, it } from "vitest";
import {
  redactInventoryItemForRole,
  redactPartUsageCost,
  redactPartsUsedForRole,
} from "../inventoryDto";

describe("inventoryDto", () => {
  it("redacts catalog cost for non-admins", () => {
    const item = { id: "1", name: "Bolt", cost: "9.99" } as never;
    expect(redactInventoryItemForRole(item, "technician").cost).toBeNull();
    expect(redactInventoryItemForRole(item, "admin").cost).toBe("9.99");
  });

  it("redacts parts-usage cost for non-admins", () => {
    const rows = [{ partName: "Bolt", cost: 12.5 }];
    expect(redactPartUsageCost(rows, "student")).toEqual([{ partName: "Bolt", cost: 0 }]);
    expect(redactPartUsageCost(rows, "admin")).toEqual(rows);
    expect(redactPartsUsedForRole(rows, "technician")).toEqual([{ partName: "Bolt", cost: 0 }]);
  });
});
