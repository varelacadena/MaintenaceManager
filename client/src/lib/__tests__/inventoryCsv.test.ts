import { describe, it, expect } from "vitest";
import { inventoryItemsToCsv, parseInventoryCsv } from "../inventoryCsv";
import type { InventoryItem } from "@shared/schema";

const sampleItem = {
  id: "1",
  name: "Test Part",
  description: "Note with, comma",
  quantity: "5",
  unit: "ea",
  location: "Bin 1",
  minQuantity: "2",
  cost: "9.99",
  trackingMode: "counted",
  category: "general",
  packageInfo: "",
  barcode: "ABC-123",
  stockStatus: "stocked",
  createdAt: new Date(),
  updatedAt: new Date(),
} as InventoryItem;

describe("inventoryItemsToCsv", () => {
  it("includes header and quoted fields with commas", () => {
    const csv = inventoryItemsToCsv([sampleItem]);
    expect(csv.split("\n")[0]).toContain("name");
    expect(csv).toContain("Test Part");
    expect(csv).toContain('"Note with, comma"');
  });
});

describe("parseInventoryCsv", () => {
  it("parses a minimal valid row", () => {
    const csv = `name,category,tracking_mode,quantity,unit
Widget,general,counted,10,ea`;
    const result = parseInventoryCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe("Widget");
      expect(result.items[0].category).toBe("general");
    }
  });

  it("rejects CSV without name column", () => {
    const result = parseInventoryCsv("qty,unit\n1,ea\n");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/name/i);
    }
  });

  it("round-trips export then parse", () => {
    const csv = inventoryItemsToCsv([sampleItem]);
    const result = parseInventoryCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].name).toBe(sampleItem.name);
      expect(result.items[0].barcode).toBe(sampleItem.barcode);
    }
  });
});
