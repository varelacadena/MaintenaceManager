import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  isLowStock,
  matchesInventorySearch,
  sortInventoryItems,
  parseInventoryErrorMessage,
} from "../inventoryUtils";
import type { InventoryItem } from "@shared/schema";

const baseItem = {
  id: "1",
  name: "Motor Oil",
  description: "5W-30 synthetic",
  quantity: "10",
  unit: "qt",
  location: "Shelf A",
  minQuantity: "5",
  cost: "8.99",
  trackingMode: "counted",
  category: "auto",
  packageInfo: "1 gal jug",
  barcode: "12345",
  stockStatus: "stocked",
  createdAt: new Date(),
  updatedAt: new Date(),
} as InventoryItem;

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });
});

describe("isLowStock", () => {
  it("detects counted items at or below min", () => {
    expect(isLowStock({ ...baseItem, quantity: "5", minQuantity: "5" })).toBe(true);
    expect(isLowStock({ ...baseItem, quantity: "6", minQuantity: "5" })).toBe(false);
  });

  it("detects status mode low/out", () => {
    expect(isLowStock({ ...baseItem, trackingMode: "status", stockStatus: "low" })).toBe(true);
    expect(isLowStock({ ...baseItem, trackingMode: "status", stockStatus: "stocked" })).toBe(false);
  });
});

describe("matchesInventorySearch", () => {
  it("matches name, barcode, location, description, and package info", () => {
    expect(matchesInventorySearch(baseItem, "motor")).toBe(true);
    expect(matchesInventorySearch(baseItem, "12345")).toBe(true);
    expect(matchesInventorySearch(baseItem, "shelf")).toBe(true);
    expect(matchesInventorySearch(baseItem, "synthetic")).toBe(true);
    expect(matchesInventorySearch(baseItem, "jug")).toBe(true);
    expect(matchesInventorySearch(baseItem, "zzz")).toBe(false);
  });

  it("matches empty query", () => {
    expect(matchesInventorySearch(baseItem, "")).toBe(true);
  });
});

describe("sortInventoryItems", () => {
  const items = [
    { ...baseItem, id: "a", name: "Zebra", quantity: "1" },
    { ...baseItem, id: "b", name: "Apple", quantity: "10" },
  ] as InventoryItem[];

  it("sorts by name ascending", () => {
    expect(sortInventoryItems(items, "name-asc").map((i) => i.name)).toEqual(["Apple", "Zebra"]);
  });

  it("sorts by quantity descending", () => {
    expect(sortInventoryItems(items, "qty-desc").map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("parseInventoryErrorMessage", () => {
  it("parses JSON message", () => {
    expect(parseInventoryErrorMessage(JSON.stringify({ message: "Validation error" }))).toBe(
      "Validation error"
    );
  });

  it("detects barcode duplicate", () => {
    expect(parseInventoryErrorMessage("duplicate key inventory_items_barcode_unique")).toContain(
      "barcode"
    );
  });
});
