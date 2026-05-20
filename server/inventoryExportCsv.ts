import type { InventoryItem } from "@shared/schema";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatQty(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? "0" : String(n);
}

export function inventoryItemsToCsvString(items: InventoryItem[], includeCost: boolean): string {
  const headers = [
    "name",
    "category",
    "tracking_mode",
    "quantity",
    "unit",
    "location",
    "min_quantity",
    ...(includeCost ? ["cost"] : []),
    "package_info",
    "barcode",
    "stock_status",
    "description",
  ];
  const rows = items.map((item) => {
    const cells = [
      item.name,
      item.category || "general",
      item.trackingMode || "counted",
      formatQty(item.quantity),
      item.unit || "",
      item.location || "",
      formatQty(item.minQuantity),
      ...(includeCost ? [item.cost ? String(item.cost) : ""] : []),
      item.packageInfo || "",
      item.barcode || "",
      item.stockStatus || "stocked",
      item.description || "",
    ];
    return cells.map((c) => escapeCsvCell(String(c ?? ""))).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}
