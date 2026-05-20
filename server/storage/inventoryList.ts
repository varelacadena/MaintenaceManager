import {
  inventoryItems,
  type InventoryItem,
} from "@shared/schema";
import { db } from "../db";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";

export type InventoryListSort = "name-asc" | "name-desc" | "qty-asc" | "qty-desc";

export type InventoryListParams = {
  page: number;
  pageSize: number;
  category?: string;
  q?: string;
  lowStock?: boolean;
  sort?: InventoryListSort;
};

export type InventoryListResult = {
  items: InventoryItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type InventorySummary = {
  total: number;
  lowStockCount: number;
  categoryCounts: Record<string, number>;
};

export const inventoryLowStockCondition = or(
  and(
    eq(inventoryItems.trackingMode, "status"),
    or(eq(inventoryItems.stockStatus, "low"), eq(inventoryItems.stockStatus, "out")),
  ),
  and(
    or(ne(inventoryItems.trackingMode, "status"), sql`${inventoryItems.trackingMode} IS NULL`),
    sql`COALESCE(CAST(${inventoryItems.minQuantity} AS DECIMAL), 0) > 0`,
    sql`COALESCE(CAST(${inventoryItems.quantity} AS DECIMAL), 0) <= COALESCE(CAST(${inventoryItems.minQuantity} AS DECIMAL), 0)`,
  ),
);

function buildSearchCondition(q: string) {
  const pattern = `%${q.trim()}%`;
  return or(
    ilike(inventoryItems.name, pattern),
    ilike(inventoryItems.barcode, pattern),
    ilike(inventoryItems.location, pattern),
    ilike(inventoryItems.description, pattern),
    ilike(inventoryItems.packageInfo, pattern),
  );
}

export type InventoryListFilter = {
  category?: string;
  q?: string;
  lowStock?: boolean;
  sort?: InventoryListSort;
};

function buildListConditions(params: InventoryListFilter) {
  const conditions = [];
  if (params.category && params.category !== "all") {
    conditions.push(eq(inventoryItems.category, params.category));
  }
  if (params.q?.trim()) {
    conditions.push(buildSearchCondition(params.q));
  }
  if (params.lowStock) {
    conditions.push(inventoryLowStockCondition);
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

function orderByForSort(sort: InventoryListSort = "name-asc") {
  switch (sort) {
    case "name-desc":
      return desc(inventoryItems.name);
    case "qty-asc":
      return sql`COALESCE(CAST(${inventoryItems.quantity} AS DECIMAL), 0) ASC`;
    case "qty-desc":
      return sql`COALESCE(CAST(${inventoryItems.quantity} AS DECIMAL), 0) DESC`;
    default:
      return asc(inventoryItems.name);
  }
}

export async function listInventoryItemsPaginated(
  params: InventoryListParams,
): Promise<InventoryListResult> {
  const page = Math.max(0, params.page);
  const pageSize = Math.min(500, Math.max(1, params.pageSize));
  const where = buildListConditions(params);

  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems)
    .where(where);

  const items = await db
    .select()
    .from(inventoryItems)
    .where(where)
    .orderBy(orderByForSort(params.sort))
    .limit(pageSize)
    .offset(page * pageSize);

  return { items, total, page, pageSize };
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const [{ count: total }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems);

  const [{ count: lowStockCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems)
    .where(inventoryLowStockCondition);

  const categoryRows = await db
    .select({
      category: inventoryItems.category,
      count: sql<number>`count(*)::int`,
    })
    .from(inventoryItems)
    .groupBy(inventoryItems.category);

  const categoryCounts: Record<string, number> = { all: total };
  for (const row of categoryRows) {
    const cat = row.category || "general";
    categoryCounts[cat] = row.count;
  }

  return { total, lowStockCount, categoryCounts };
}

/** All rows matching filters (for CSV export; max 10k). */
export async function listInventoryItemsForExport(
  filter: InventoryListFilter,
  maxRows = 10_000,
): Promise<InventoryItem[]> {
  const where = buildListConditions(filter);
  return db
    .select()
    .from(inventoryItems)
    .where(where)
    .orderBy(orderByForSort(filter.sort))
    .limit(maxRows);
}
