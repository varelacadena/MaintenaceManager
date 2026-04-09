import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "available",
  "reserved",
  "in_use",
  "needs_cleaning",
  "needs_maintenance",
  "out_of_service"
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "approved",
  "active",
  "pending_review",
  "completed",
  "cancelled"
]);

export const lockboxStatusEnum = pgEnum("lockbox_status", ["active", "inactive"]);

export const lockboxes = pgTable("lockboxes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  status: lockboxStatusEnum("lockbox_status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLockboxSchema = createInsertSchema(lockboxes).omit({
  id: true,
  createdAt: true,
});
export type InsertLockbox = z.infer<typeof insertLockboxSchema>;
export type Lockbox = typeof lockboxes.$inferSelect;

export const lockboxCodeStatusEnum = pgEnum("lockbox_code_status", ["active", "inactive"]);

export const lockboxCodes = pgTable("lockbox_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lockboxId: varchar("lockbox_id").notNull().references(() => lockboxes.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull(),
  status: lockboxCodeStatusEnum("lockbox_code_status").notNull().default("active"),
  lastUsedAt: timestamp("last_used_at"),
  useCount: integer("use_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLockboxCodeSchema = createInsertSchema(lockboxCodes).omit({
  id: true,
  lastUsedAt: true,
  useCount: true,
  createdAt: true,
});
export type InsertLockboxCode = z.infer<typeof insertLockboxCodeSchema>;
export type LockboxCode = typeof lockboxCodes.$inferSelect;

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  vehicleId: varchar("vehicle_id", { length: 50 }).notNull().unique(),
  vin: varchar("vin", { length: 50 }),
  licensePlate: varchar("license_plate", { length: 20 }),
  category: varchar("category", { length: 50 }).notNull(),
  status: vehicleStatusEnum("status").notNull().default("available"),
  currentMileage: integer("current_mileage"),
  fuelType: varchar("fuel_type", { length: 50 }).notNull(),
  passengerCapacity: integer("passenger_capacity"),
  color: varchar("color", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vehicle_status").on(table.status),
]);

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

export const vehicleReservations = pgTable("vehicle_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  purpose: varchar("purpose", { length: 200 }).notNull(),
  passengerCount: integer("passenger_count").notNull(),
  notes: text("notes"),
  keyPickupMethod: varchar("key_pickup_method", { length: 50 }),
  lockboxId: varchar("lockbox_id").references(() => lockboxes.id, { onDelete: "set null" }),
  adminNotes: text("admin_notes"),
  advisoryAccepted: boolean("advisory_accepted").default(false),
  lastViewedStatus: varchar("last_viewed_status", { length: 20 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: reservationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVehicleReservationSchema = createInsertSchema(vehicleReservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVehicleReservation = z.infer<typeof insertVehicleReservationSchema>;
export type VehicleReservation = typeof vehicleReservations.$inferSelect;

export const vehicleCheckOutLogs = pgTable("vehicle_check_out_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservationId: varchar("reservation_id").notNull().references(() => vehicleReservations.id, { onDelete: "cascade" }),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "restrict" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  startMileage: integer("start_mileage").notNull(),
  fuelLevel: varchar("fuel_level", { length: 20 }).notNull(),
  cleanlinessConfirmed: boolean("cleanliness_confirmed").notNull().default(false),
  damageNotes: text("damage_notes"),
  digitalSignature: text("digital_signature"),
  adminOverride: boolean("admin_override").default(false),
  assignedCodeId: varchar("assigned_code_id").references(() => lockboxCodes.id, { onDelete: "set null" }),
  checkOutTime: timestamp("check_out_time").notNull().defaultNow(),
}, (table) => [
  index("idx_checkout_vehicle_time").on(table.vehicleId, table.checkOutTime),
]);

export const insertVehicleCheckOutLogSchema = createInsertSchema(vehicleCheckOutLogs, {
  fuelLevel: z.string(),
}).omit({
  id: true,
  checkOutTime: true,
}).extend({
  adminOverride: z.boolean().optional(),
});
export type InsertVehicleCheckOutLog = z.infer<typeof insertVehicleCheckOutLogSchema>;
export type VehicleCheckOutLog = typeof vehicleCheckOutLogs.$inferSelect;

export const vehicleCheckInLogs = pgTable("vehicle_check_in_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "restrict" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  checkOutLogId: varchar("check_out_log_id").notNull().references(() => vehicleCheckOutLogs.id, { onDelete: "cascade" }),
  checkInDate: timestamp("check_in_date").notNull().defaultNow(),
  endMileage: integer("end_mileage").notNull(),
  endFuelLevel: integer("end_fuel_level").notNull().default(100),
  cleanlinessStatus: varchar("cleanliness_status", { length: 50 }).notNull(),
  issues: text("issues"),
  returnNotes: text("return_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  fuelLevel: varchar("fuel_level", { length: 20 }),
  checkInTime: timestamp("check_in_time").defaultNow(),
}, (table) => [
  index("idx_checkin_vehicle_time").on(table.vehicleId, table.checkInTime),
]);

export const insertVehicleCheckInLogSchema = createInsertSchema(vehicleCheckInLogs, {
  fuelLevel: z.string().optional(),
}).omit({
  id: true,
  checkInDate: true,
  createdAt: true,
  checkInTime: true,
});
export type InsertVehicleCheckInLog = z.infer<typeof insertVehicleCheckInLogSchema>;
export type VehicleCheckInLog = typeof vehicleCheckInLogs.$inferSelect;

export const vehicleMaintenanceSchedules = pgTable("vehicle_maintenance_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  maintenanceType: varchar("maintenance_type", { length: 100 }).notNull(),
  mileageThreshold: integer("mileage_threshold"),
  timeThresholdDays: integer("time_threshold_days"),
  lastPerformedMileage: integer("last_performed_mileage"),
  lastPerformedDate: timestamp("last_performed_date"),
  nextDueMileage: integer("next_due_mileage"),
  nextDueDate: timestamp("next_due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVehicleMaintenanceScheduleSchema = createInsertSchema(vehicleMaintenanceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVehicleMaintenanceSchedule = z.infer<typeof insertVehicleMaintenanceScheduleSchema>;
export type VehicleMaintenanceSchedule = typeof vehicleMaintenanceSchedules.$inferSelect;

export const vehicleDocumentTypeEnum = pgEnum("vehicle_document_type", [
  "insurance",
  "annual_inspection",
  "registration",
  "other"
]);

export const vehicleDocuments = pgTable("vehicle_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  documentType: vehicleDocumentTypeEnum("document_type").notNull(),
  documentName: varchar("document_name", { length: 200 }),
  expirationDate: timestamp("expiration_date").notNull(),
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_vehicle_documents_vehicle").on(table.vehicleId),
  index("idx_vehicle_documents_expiration").on(table.expirationDate),
]);

export const insertVehicleDocumentSchema = createInsertSchema(vehicleDocuments).omit({
  id: true,
  reminderSent: true,
  reminderSentAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVehicleDocument = z.infer<typeof insertVehicleDocumentSchema>;
export type VehicleDocument = typeof vehicleDocuments.$inferSelect;
