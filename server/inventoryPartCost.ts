import { storage } from "./storage";

/** Compute line cost from inventory unit cost × quantity (uses DB, not redacted client values). */
export async function resolvePartLineCost(
  inventoryItemId: string | null | undefined,
  quantity: string | number,
  fallbackCost = 0,
  role?: string,
): Promise<number> {
  const qty = parseFloat(String(quantity)) || 0;
  if (!inventoryItemId || qty <= 0) {
    const cost =
      typeof fallbackCost === "number" && !Number.isNaN(fallbackCost) ? fallbackCost : 0;
    return role === "admin" ? cost : 0;
  }
  const item = await storage.getInventoryItem(inventoryItemId);
  if (!item) return fallbackCost;
  const unitCost = parseFloat(String(item.cost ?? 0)) || 0;
  return Math.round(unitCost * qty * 100) / 100;
}
