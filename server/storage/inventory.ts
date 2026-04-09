import {
  inventoryItems,
  partsUsed,
  type InventoryItem,
  type InsertInventoryItem,
  type PartUsed,
  type InsertPartUsed,
} from "@shared/schema";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";

export async function getInventoryItems(): Promise<InventoryItem[]> {
  return await db.select().from(inventoryItems);
}

export async function getInventoryItem(id: string): Promise<InventoryItem | undefined> {
  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
  return item;
}

export async function createInventoryItem(itemData: InsertInventoryItem): Promise<InventoryItem> {
  const [item] = await db.insert(inventoryItems).values(itemData).returning();
  return item;
}

export async function updateInventoryItem(id: string, itemData: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined> {
  const [item] = await db
    .update(inventoryItems)
    .set({ ...itemData, updatedAt: new Date() })
    .where(eq(inventoryItems.id, id))
    .returning();
  return item;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
}

export async function updateInventoryQuantity(id: string, quantityChange: number): Promise<InventoryItem | undefined> {
  const [item] = await db
    .update(inventoryItems)
    .set({ 
      quantity: sql`${inventoryItems.quantity} + ${quantityChange}`,
      updatedAt: new Date()
    })
    .where(eq(inventoryItems.id, id))
    .returning();
  return item;
}

export async function getInventoryItemByBarcode(barcode: string): Promise<InventoryItem | undefined> {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.barcode, barcode));
  return item;
}

export async function updateInventoryStatus(id: string, stockStatus: string): Promise<InventoryItem | undefined> {
  const [item] = await db
    .update(inventoryItems)
    .set({ stockStatus, updatedAt: new Date() })
    .where(eq(inventoryItems.id, id))
    .returning();
  return item;
}

export async function useOneContainer(id: string): Promise<InventoryItem | undefined> {
  const current = await getInventoryItem(id);
  if (!current) return undefined;
  const currentQty = parseFloat(current.quantity as unknown as string) || 0;
  const newQty = Math.max(0, currentQty - 1);
  const [item] = await db
    .update(inventoryItems)
    .set({ 
      quantity: String(newQty),
      updatedAt: new Date()
    })
    .where(eq(inventoryItems.id, id))
    .returning();
  return item;
}

export async function createPartUsed(partData: InsertPartUsed): Promise<PartUsed> {
  const [part] = await db.insert(partsUsed).values(partData).returning();
  return part;
}

export async function deletePartUsed(id: string): Promise<void> {
  await db.delete(partsUsed).where(eq(partsUsed.id, id));
}

export async function getPartsByTask(taskId: string): Promise<PartUsed[]> {
  return await db
    .select()
    .from(partsUsed)
    .where(eq(partsUsed.taskId, taskId));
}
