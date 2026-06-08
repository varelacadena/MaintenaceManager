import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { properties } from "./facilities";

export const mobileEquipmentStatusEnum = pgEnum("mobile_equipment_status", [
  "available",
  "in_use",
  "needs_maintenance",
  "out_of_service",
]);

export const mobileEquipment = pgTable("mobile_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default("other"),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 200 }),
  assetTag: varchar("asset_tag", { length: 100 }),
  status: mobileEquipmentStatusEnum("status").notNull().default("available"),
  currentPropertyId: varchar("current_property_id").references(() => properties.id, {
    onDelete: "set null",
  }),
  currentLocationNotes: text("current_location_notes"),
  notes: text("notes"),
  hoursOrMeter: doublePrecision("hours_or_meter"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMobileEquipmentSchema = createInsertSchema(mobileEquipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMobileEquipment = z.infer<typeof insertMobileEquipmentSchema>;
export type MobileEquipment = typeof mobileEquipment.$inferSelect;

export const mobileEquipmentMaintenanceLogs = pgTable("mobile_equipment_maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mobileEquipmentId: varchar("mobile_equipment_id")
    .notNull()
    .references(() => mobileEquipment.id, { onDelete: "cascade" }),
  maintenanceDate: timestamp("maintenance_date").notNull().defaultNow(),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  cost: doublePrecision("cost").default(0),
  performedBy: varchar("performed_by", { length: 200 }),
  hoursOrMeterAtMaintenance: doublePrecision("hours_or_meter_at_maintenance"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMobileEquipmentMaintenanceLogSchema = createInsertSchema(
  mobileEquipmentMaintenanceLogs,
).omit({
  id: true,
  createdAt: true,
});
export type InsertMobileEquipmentMaintenanceLog = z.infer<
  typeof insertMobileEquipmentMaintenanceLogSchema
>;
export type MobileEquipmentMaintenanceLog =
  typeof mobileEquipmentMaintenanceLogs.$inferSelect;

export const mobileEquipmentMaintenanceParts = pgTable("mobile_equipment_maintenance_parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maintenanceLogId: varchar("maintenance_log_id")
    .notNull()
    .references(() => mobileEquipmentMaintenanceLogs.id, { onDelete: "cascade" }),
  partName: varchar("part_name", { length: 200 }).notNull(),
  partNumber: varchar("part_number", { length: 200 }),
  quantity: integer("quantity").default(1),
  vendor: varchar("vendor", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMobileEquipmentMaintenancePartSchema = createInsertSchema(
  mobileEquipmentMaintenanceParts,
).omit({
  id: true,
  createdAt: true,
});
export type InsertMobileEquipmentMaintenancePart = z.infer<
  typeof insertMobileEquipmentMaintenancePartSchema
>;
export type MobileEquipmentMaintenancePart =
  typeof mobileEquipmentMaintenanceParts.$inferSelect;

export type MobileEquipmentMaintenanceLogWithParts = MobileEquipmentMaintenanceLog & {
  parts: MobileEquipmentMaintenancePart[];
};

export const maintenancePartInputSchema = z.object({
  partName: z.string().min(1),
  partNumber: z.string().optional().nullable(),
  quantity: z.number().int().positive().optional().nullable(),
  vendor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createMobileEquipmentMaintenanceLogBodySchema = insertMobileEquipmentMaintenanceLogSchema
  .omit({ mobileEquipmentId: true })
  .extend({
    maintenanceDate: z.coerce.date().optional(),
    parts: z.array(maintenancePartInputSchema).optional().default([]),
  });
