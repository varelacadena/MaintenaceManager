import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { properties, spaces, equipment } from "./facilities";
import { serviceRequests, urgencyEnum, areas, subdivisions } from "./serviceRequests";
import { vehicles } from "./vehicles";
import { vendors } from "./vendors";

export const taskTypeEnum = pgEnum("task_type", ["one_time", "recurring", "reminder", "project"]);
export const taskStatusEnum = pgEnum("task_status", ["not_started", "needs_estimate", "waiting_approval", "ready", "in_progress", "completed", "on_hold"]);
export const contactTypeEnum = pgEnum("contact_type", ["requester", "staff", "other"]);
export const executorTypeEnum = pgEnum("executor_type", ["student", "technician"]);
export const estimateStatusEnum = pgEnum("estimate_status", ["none", "needs_estimate", "waiting_approval", "approved"]);

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").references(() => serviceRequests.id, { onDelete: "set null" }),
  projectId: varchar("project_id"),
  propertyId: varchar("property_id").references(() => properties.id),
  spaceId: varchar("space_id").references(() => spaces.id),
  equipmentId: varchar("equipment_id").references(() => equipment.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description").notNull(),
  urgency: urgencyEnum("urgency").notNull(),
  areaId: varchar("area_id").references(() => areas.id),
  subdivisionId: varchar("subdivision_id").references(() => subdivisions.id),
  initialDate: timestamp("initial_date").notNull(),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  assignedVendorId: varchar("assigned_vendor_id").references(() => vendors.id),
  taskType: taskTypeEnum("task_type").notNull().default("one_time"),
  executorType: executorTypeEnum("executor_type"),
  assignedPool: varchar("assigned_pool", { length: 50 }),
  status: taskStatusEnum("task_status").notNull().default("not_started"),
  onHoldReason: text("on_hold_reason"),
  recurringFrequency: text("recurring_frequency"),
  recurringInterval: integer("recurring_interval"),
  recurringEndDate: text("recurring_end_date"),
  contactType: contactTypeEnum("contact_type"),
  contactStaffId: varchar("contact_staff_id").references(() => users.id),
  contactName: varchar("contact_name", { length: 200 }),
  contactEmail: varchar("contact_email", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  instructions: text("instructions"),
  requiresPhoto: boolean("requires_photo").default(false),
  requiresEstimate: boolean("requires_estimate").default(false),
  estimateStatus: estimateStatusEnum("estimate_status").default("none"),
  approvedQuoteId: varchar("approved_quote_id"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  estimatedHours: doublePrecision("estimated_hours"),
  scheduledStartTime: varchar("scheduled_start_time", { length: 5 }),
  requiredSkill: varchar("required_skill", { length: 100 }),
  aiGenerated: boolean("ai_generated").default(false),
  parentTaskId: varchar("parent_task_id"),
  isCampusWide: boolean("is_campus_wide").default(false),
  propertyIds: text("property_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualCompletionDate: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, createdAt: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

export const noteTypeEnum = pgEnum("note_type", ["job_note", "recommendation"]);

export const taskNotes = pgTable("task_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  noteType: noteTypeEnum("note_type").notNull().default("job_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskNoteSchema = createInsertSchema(taskNotes).omit({ id: true, createdAt: true });
export type InsertTaskNote = z.infer<typeof insertTaskNoteSchema>;
export type TaskNote = typeof taskNotes.$inferSelect;

export const taskChecklistGroups = pgTable("task_checklist_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskChecklistItems = pgTable("task_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => taskChecklistGroups.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 500 }).notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskChecklistGroupSchema = createInsertSchema(taskChecklistGroups).omit({ id: true, createdAt: true });
export type InsertTaskChecklistGroup = z.infer<typeof insertTaskChecklistGroupSchema>;
export type TaskChecklistGroup = typeof taskChecklistGroups.$inferSelect;

export const insertTaskChecklistItemSchema = createInsertSchema(taskChecklistItems).omit({ id: true, createdAt: true });
export type InsertTaskChecklistItem = z.infer<typeof insertTaskChecklistItemSchema>;
export type TaskChecklistItem = typeof taskChecklistItems.$inferSelect;

export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  items: jsonb("items").notNull().default([]),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;

export const taskHelpers = pgTable("task_helpers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const insertTaskHelperSchema = createInsertSchema(taskHelpers).omit({ id: true, assignedAt: true });
export type InsertTaskHelper = z.infer<typeof insertTaskHelperSchema>;
export type TaskHelper = typeof taskHelpers.$inferSelect;

export const taskDependencies = pgTable("task_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependsOnTaskId: varchar("depends_on_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type", { length: 30 }).notNull().default("finish_to_start"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskDependencySchema = createInsertSchema(taskDependencies).omit({ id: true, createdAt: true });
export type InsertTaskDependency = z.infer<typeof insertTaskDependencySchema>;
export type TaskDependency = typeof taskDependencies.$inferSelect;

export const slaConfigs = pgTable("sla_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  urgencyLevel: varchar("urgency_level", { length: 20 }).notNull(),
  responseHours: integer("response_hours").notNull().default(24),
  resolutionHours: integer("resolution_hours").notNull().default(72),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSlaConfigSchema = createInsertSchema(slaConfigs).omit({ id: true, updatedAt: true });
export type InsertSlaConfig = z.infer<typeof insertSlaConfigSchema>;
export type SlaConfig = typeof slaConfigs.$inferSelect;

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
