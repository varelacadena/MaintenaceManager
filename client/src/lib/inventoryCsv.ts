import type { InventoryItem, InsertInventoryItem } from "@shared/schema";
import { INVENTORY_CATEGORIES, INVENTORY_TRACKING_MODES, INVENTORY_STOCK_STATUSES } from "@shared/schema";
import { formatQty } from "@/pages/Inventory/inventoryConstants";
import { isLowStock } from "@/lib/inventoryUtils";

export const INVENTORY_PAGE_SIZE = 30;

const CSV_HEADERS = [
  "name",
  "category",
  "tracking_mode",
  "quantity",
  "unit",
  "location",
  "min_quantity",
  "cost",
  "package_info",
  "barcode",
  "stock_status",
  "description",
] as const;

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function inventoryItemsToCsv(items: InventoryItem[]): string {
  const header = CSV_HEADERS.join(",");
  const rows = items.map((item) => {
    const cells = [
      item.name,
      item.category || "general",
      item.trackingMode || "counted",
      formatQty(item.quantity),
      item.unit || "",
      item.location || "",
      formatQty(item.minQuantity),
      item.cost ? String(item.cost) : "",
      item.packageInfo || "",
      item.barcode || "",
      item.stockStatus || "stocked",
      item.description || "",
    ];
    return cells.map((c) => escapeCsvCell(String(c))).join(",");
  });
  return [header, ...rows].join("\n");
}

export function downloadInventoryCsv(items: InventoryItem[], filename = "inventory-export.csv") {
  const csv = inventoryItemsToCsv(items);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export type InventoryCsvParseResult =
  | { ok: true; items: InsertInventoryItem[] }
  | { ok: false; error: string };

export function parseInventoryCsv(text: string): InventoryCsvParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return { ok: false, error: "CSV must include a header row and at least one data row." };
  }

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const nameIdx = header.indexOf("name");
  if (nameIdx === -1) {
    return { ok: false, error: 'CSV must include a "name" column.' };
  }

  const col = (row: string[], key: string) => {
    const idx = header.indexOf(key);
    return idx >= 0 ? row[idx]?.trim() ?? "" : "";
  };

  const items: InsertInventoryItem[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const name = row[nameIdx]?.trim();
    if (!name) {
      errors.push(`Row ${i + 1}: name is required`);
      continue;
    }

    const category = col(row, "category") || "general";
    if (!INVENTORY_CATEGORIES.includes(category as (typeof INVENTORY_CATEGORIES)[number])) {
      errors.push(`Row ${i + 1}: invalid category "${category}"`);
      continue;
    }

    const trackingMode = col(row, "tracking_mode") || "counted";
    if (!INVENTORY_TRACKING_MODES.includes(trackingMode as (typeof INVENTORY_TRACKING_MODES)[number])) {
      errors.push(`Row ${i + 1}: invalid tracking_mode "${trackingMode}"`);
      continue;
    }

    const stockStatus = col(row, "stock_status") || "stocked";
    if (stockStatus && !INVENTORY_STOCK_STATUSES.includes(stockStatus as (typeof INVENTORY_STOCK_STATUSES)[number])) {
      errors.push(`Row ${i + 1}: invalid stock_status "${stockStatus}"`);
      continue;
    }

    const barcode = col(row, "barcode");
    items.push({
      name,
      category: category as InsertInventoryItem["category"],
      trackingMode: trackingMode as InsertInventoryItem["trackingMode"],
      quantity: col(row, "quantity") || "0",
      unit: col(row, "unit") || undefined,
      location: col(row, "location") || undefined,
      minQuantity: col(row, "min_quantity") || "0",
      cost: col(row, "cost") || undefined,
      packageInfo: col(row, "package_info") || undefined,
      barcode: barcode || null,
      stockStatus: stockStatus as InsertInventoryItem["stockStatus"],
      description: col(row, "description") || undefined,
    });
  }

  if (errors.length > 0) {
    return { ok: false, error: errors.slice(0, 5).join("; ") + (errors.length > 5 ? ` (+${errors.length - 5} more)` : "") };
  }
  if (items.length === 0) {
    return { ok: false, error: "No valid rows found in CSV." };
  }
  return { ok: true, items };
}

export function inventoryCsvTemplate(): string {
  return [
    CSV_HEADERS.join(","),
    'Example Part,general,counted,10,pcs,Shelf A,2,5.99,12-pack case,,stocked,Optional notes',
  ].join("\n");
}

export function downloadInventoryCsvTemplate() {
  const blob = new Blob([inventoryCsvTemplate()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "inventory-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}
