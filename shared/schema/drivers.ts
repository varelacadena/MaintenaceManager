import { sql } from "drizzle-orm";
import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const driverStatusValues = ["active", "inactive"] as const;
export type DriverStatus = (typeof driverStatusValues)[number];

export const penaltyReasonValues = [
  "late_return",
  "no_checkin",
  "dirty",
  "low_fuel",
  "damage",
  "other",
] as const;
export type PenaltyReason = (typeof penaltyReasonValues)[number];

export const approvedDrivers = pgTable("approved_drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  department: varchar("department", { length: 120 }),
  email: varchar("email", { length: 200 }),
  phone: varchar("phone", { length: 30 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_approved_drivers_last_name").on(table.lastName),
]);

export const insertApprovedDriverSchema = createInsertSchema(approvedDrivers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApprovedDriver = z.infer<typeof insertApprovedDriverSchema>;
export type ApprovedDriver = typeof approvedDrivers.$inferSelect;

export const driverPenalties = pgTable("driver_penalties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").notNull().references(() => approvedDrivers.id, { onDelete: "cascade" }),
  reservationId: varchar("reservation_id"),
  reason: varchar("reason", { length: 50 }).notNull(),
  note: text("note"),
  appliedBy: varchar("applied_by").references(() => users.id, { onDelete: "set null" }),
  appliedAt: timestamp("applied_at").defaultNow(),
  clearedAt: timestamp("cleared_at"),
  clearedBy: varchar("cleared_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  index("idx_driver_penalties_driver").on(table.driverId),
]);

export const insertDriverPenaltySchema = createInsertSchema(driverPenalties).omit({
  id: true,
  appliedAt: true,
  clearedAt: true,
  clearedBy: true,
});
export type InsertDriverPenalty = z.infer<typeof insertDriverPenaltySchema>;
export type DriverPenalty = typeof driverPenalties.$inferSelect;
