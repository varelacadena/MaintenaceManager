import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  numeric,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tasks } from "./workOrders";

export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: varchar("unit", { length: 50 }),
  location: varchar("location", { length: 200 }),
  minQuantity: numeric("min_quantity", { precision: 10, scale: 2 }).default("0"),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  trackingMode: varchar("tracking_mode", { length: 20 }).notNull().default("counted"),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  packageInfo: varchar("package_info", { length: 200 }),
  barcode: varchar("barcode", { length: 200 }),
  stockStatus: varchar("stock_status", { length: 20 }).default("stocked"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const partsUsed = pgTable("parts_used", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  inventoryItemId: varchar("inventory_item_id").references(() => inventoryItems.id),
  partName: varchar("part_name", { length: 200 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  cost: doublePrecision("cost").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPartUsedSchema = createInsertSchema(partsUsed).omit({ id: true, createdAt: true });
export type InsertPartUsed = z.infer<typeof insertPartUsedSchema>;
export type PartUsed = typeof partsUsed.$inferSelect;
