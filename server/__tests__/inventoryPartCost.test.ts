import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getInventoryItem: vi.fn(),
  },
}));

import { storage } from "../storage";
import { resolvePartLineCost } from "../inventoryPartCost";

describe("resolvePartLineCost", () => {
  beforeEach(() => {
    vi.mocked(storage.getInventoryItem).mockReset();
  });

  it("multiplies unit cost from DB by quantity", async () => {
    vi.mocked(storage.getInventoryItem).mockResolvedValue({
      id: "item-1",
      cost: "12.50",
    } as never);

    const cost = await resolvePartLineCost("item-1", "2", 0);
    expect(cost).toBe(25);
  });

  it("ignores redacted client fallback when inventory item exists", async () => {
    vi.mocked(storage.getInventoryItem).mockResolvedValue({
      id: "item-1",
      cost: "5",
    } as never);

    const cost = await resolvePartLineCost("item-1", "1", 99);
    expect(cost).toBe(5);
  });

  it("uses fallback when no inventory item id (admin only)", async () => {
    const cost = await resolvePartLineCost(undefined, "3", 4, "admin");
    expect(cost).toBe(4);
  });

  it("ignores manual fallback cost for non-admin", async () => {
    const cost = await resolvePartLineCost(undefined, "3", 99, "technician");
    expect(cost).toBe(0);
  });
});
