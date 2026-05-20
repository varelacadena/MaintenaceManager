import { useQuery } from "@tanstack/react-query";
import { INVENTORY_PAGE_SIZE } from "@/lib/inventoryCsv";
import type { InventorySortKey } from "@/lib/inventoryUtils";
import type { InventoryListResponse, InventorySummaryResponse } from "./inventoryTypes";

export type InventoryQueryFilters = {
  activeCategory: string;
  stockFilter: "all" | "low";
  sortKey: InventorySortKey;
  search: string;
  page: number;
};

function buildListParams(filters: InventoryQueryFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(INVENTORY_PAGE_SIZE),
    sort: filters.sortKey,
  });
  if (filters.activeCategory !== "all") params.set("category", filters.activeCategory);
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.stockFilter === "low") params.set("lowStock", "true");
  return params;
}

export function useInventoryQueries(
  filters: InventoryQueryFilters,
  debouncedSearch: string,
) {
  const queryFilters = { ...filters, search: debouncedSearch };

  const listQuery = useQuery<InventoryListResponse>({
    queryKey: ["/api/inventory", "list", queryFilters],
    queryFn: async () => {
      const params = buildListParams(queryFilters);
      const res = await fetch(`/api/inventory?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load inventory");
      return res.json();
    },
  });

  const summaryQuery = useQuery<InventorySummaryResponse>({
    queryKey: ["/api/inventory", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load inventory summary");
      return res.json();
    },
  });

  return { listQuery, summaryQuery, buildListParams };
}

/** Download filtered inventory as CSV from the server export endpoint (up to 10k rows). */
export async function downloadInventoryExportCsv(
  filters: Omit<InventoryQueryFilters, "page"> & { search: string },
  filename = "inventory-export.csv",
): Promise<void> {
  const params = new URLSearchParams({ sort: filters.sortKey });
  if (filters.activeCategory !== "all") params.set("category", filters.activeCategory);
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.stockFilter === "low") params.set("lowStock", "true");

  const res = await fetch(`/api/inventory/export?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to export inventory");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
