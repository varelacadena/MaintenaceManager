import { sql } from "drizzle-orm";
import { doublePrecision, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tasks } from "./workOrders";
import { vehicles } from "./vehicles";

export const vehicleMaintenanceLogs = pgTable("vehicle_maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "set null" }),
  maintenanceDate: timestamp("maintenance_date").notNull().defaultNow(),
  type: varchar("type", { length: 100 }).notNull(),
  description: text("description").notNull(),
  cost: doublePrecision("cost").default(0),
  mileageAtMaintenance: integer("mileage_at_maintenance"),
  performedBy: varchar("performed_by", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVehicleMaintenanceLogSchema = createInsertSchema(vehicleMaintenanceLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertVehicleMaintenanceLog = z.infer<typeof insertVehicleMaintenanceLogSchema>;
export type VehicleMaintenanceLog = typeof vehicleMaintenanceLogs.$inferSelect;
