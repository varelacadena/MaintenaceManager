import { sql } from "drizzle-orm";
import { date, doublePrecision, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { equipment, properties } from "./facilities";
import { mobileEquipment } from "./mobileEquipment";
import { projects } from "./projects";
import { users } from "./users";
import { vehicles } from "./vehicles";
import { tasks } from "./workOrders";

export const PURCHASE_LINK_KINDS = ["task", "vehicle", "equipment", "tool", "property", "project"] as const;
export type PurchaseLinkKind = (typeof PURCHASE_LINK_KINDS)[number];

export const PURCHASE_PURPOSES = ["shop_stock", "general"] as const;
export type PurchasePurpose = (typeof PURCHASE_PURPOSES)[number];

export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeName: varchar("store_name", { length: 200 }).notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  purchasedOn: date("purchased_on").notNull(),
  poNumber: varchar("po_number", { length: 80 }),
  receiptFileName: varchar("receipt_file_name", { length: 500 }),
  receiptFileType: varchar("receipt_file_type", { length: 100 }),
  receiptObjectPath: varchar("receipt_object_path", { length: 1000 }),
  purpose: varchar("purpose", { length: 20 }),
  purposeNote: text("purpose_note"),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: varchar("created_by_name", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseLinks = pgTable("purchase_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  purchaseId: varchar("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id").references(() => equipment.id, { onDelete: "cascade" }),
  mobileEquipmentId: varchar("mobile_equipment_id").references(() => mobileEquipment.id, { onDelete: "cascade" }),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "cascade" }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type PurchaseLink = typeof purchaseLinks.$inferSelect;

export type PurchaseLinkView = {
  id: string;
  kind: PurchaseLinkKind;
  targetId: string;
  label: string;
};

export type PurchaseView = Purchase & {
  links: PurchaseLinkView[];
  hasReceipt: boolean;
};
