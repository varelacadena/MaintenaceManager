import type { InventoryItem } from "@shared/schema";

export type InventorySortKey = "name-asc" | "name-desc" | "qty-asc" | "qty-desc";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isLowStock(item: InventoryItem): boolean {
  if (item.trackingMode === "status") {
    return item.stockStatus === "low" || item.stockStatus === "out";
  }
  const qty = parseFloat(String(item.quantity ?? 0)) || 0;
  const min = parseFloat(String(item.minQuantity ?? 0)) || 0;
  return min > 0 && qty <= min;
}

export function matchesInventorySearch(item: InventoryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fields = [
    item.name,
    item.barcode,
    item.location,
    item.description,
    item.packageInfo,
  ];
  return fields.some((f) => f && f.toLowerCase().includes(q));
}

export function sortInventoryItems(items: InventoryItem[], sortKey: InventorySortKey): InventoryItem[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortKey) {
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "qty-asc": {
        const qa = parseFloat(String(a.quantity ?? 0)) || 0;
        const qb = parseFloat(String(b.quantity ?? 0)) || 0;
        return qa - qb;
      }
      case "qty-desc": {
        const qa = parseFloat(String(a.quantity ?? 0)) || 0;
        const qb = parseFloat(String(b.quantity ?? 0)) || 0;
        return qb - qa;
      }
      case "name-asc":
      default:
        return a.name.localeCompare(b.name);
    }
  });
  return sorted;
}

export function parseInventoryErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.message) return String(parsed.message);
  } catch {
    /* plain text */
  }
  if (raw.includes("inventory_items_barcode_unique") || raw.includes("duplicate key")) {
    return "Another item already uses this barcode.";
  }
  if (raw.includes("parts_used") || raw.includes("foreign key")) {
    return "This item is linked to parts on tasks. Remove those usages first.";
  }
  return raw || "Something went wrong";
}
