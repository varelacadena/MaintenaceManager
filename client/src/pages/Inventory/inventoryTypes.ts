import type { InventoryItem } from "@shared/schema";

export type InventoryListResponse = {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type InventorySummaryResponse = {
  total: number;
  lowStockCount: number;
  categoryCounts: Record<string, number>;
};
