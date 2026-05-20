import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InventoryItem } from "@shared/schema";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { InventoryListResponse } from "@/pages/Inventory/inventoryTypes";

export const TASK_INVENTORY_SEARCH_PAGE_SIZE = 50;

async function fetchInventorySearch(q: string): Promise<InventoryItem[]> {
  const params = new URLSearchParams({
    page: "0",
    pageSize: String(TASK_INVENTORY_SEARCH_PAGE_SIZE),
    sort: "name-asc",
  });
  if (q.trim()) params.set("q", q.trim());
  const res = await fetch(`/api/inventory?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to search inventory");
  const data: InventoryListResponse = await res.json();
  return data.items;
}

/**
 * Server-backed inventory search for task part pickers (no full-catalog load).
 */
export function useInventorySearch(
  searchQuery: string,
  options?: { enabled?: boolean; selectedItemId?: string },
) {
  const debouncedQ = useDebouncedValue(searchQuery, 300);
  const enabled = options?.enabled !== false;

  const searchQueryResult = useQuery({
    queryKey: ["/api/inventory", "search", debouncedQ],
    queryFn: () => fetchInventorySearch(debouncedQ),
    enabled,
  });

  const { data: selectedItem } = useQuery<InventoryItem | null>({
    queryKey: ["/api/inventory", options?.selectedItemId],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/${options!.selectedItemId}`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: enabled && !!options?.selectedItemId,
  });

  const inventoryItems = useMemo(() => {
    const base = searchQueryResult.data ?? [];
    if (!selectedItem) return base;
    if (base.some((i) => i.id === selectedItem.id)) return base;
    return [selectedItem, ...base];
  }, [searchQueryResult.data, selectedItem]);

  return {
    inventoryItems,
    isInventoryLoading: searchQueryResult.isLoading,
    inventorySearchEmpty: !searchQueryResult.isLoading && inventoryItems.length === 0,
  };
}
