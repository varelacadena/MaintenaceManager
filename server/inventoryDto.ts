import type { InventoryItem } from "@shared/schema";

/** Strip cost for non-admin readers (technicians, students). */
export function redactInventoryItemForRole(
  item: InventoryItem,
  role: string | undefined,
): InventoryItem {
  if (role === "admin") return item;
  return { ...item, cost: null };
}

export function redactInventoryItemsForRole(
  items: InventoryItem[],
  role: string | undefined,
): InventoryItem[] {
  if (role === "admin") return items;
  return items.map((item) => redactInventoryItemForRole(item, role));
}

export function redactPartUsageCost<T extends { cost: number }>(
  rows: T[],
  role: string | undefined,
): T[] {
  if (role === "admin") return rows;
  return rows.map((row) => ({ ...row, cost: 0 }));
}

/** Alias for parts_used rows returned from task APIs. */
export const redactPartsUsedForRole = redactPartUsageCost;

export function formatInventoryDbError(err: unknown): string | null {
  const dbErr = err as { code?: string; constraint?: string };
  if (dbErr?.code === "23505") {
    if (dbErr.constraint?.includes("barcode") || String(err).includes("barcode")) {
      return "Another item already uses this barcode.";
    }
    return "A duplicate value conflicts with an existing record.";
  }
  return null;
}
