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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { tasks } from "./workOrders";
import { serviceRequests } from "./serviceRequests";
import { equipment } from "./facilities";
import { vehicleCheckOutLogs, vehicleCheckInLogs } from "./vehicles";

export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  requestId: varchar("request_id").references(() => serviceRequests.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id").references(() => equipment.id, { onDelete: "cascade" }),
  vehicleCheckOutLogId: varchar("vehicle_check_out_log_id").references(() => vehicleCheckOutLogs.id, { onDelete: "cascade" }),
  vehicleCheckInLogId: varchar("vehicle_check_in_log_id").references(() => vehicleCheckInLogs.id, { onDelete: "cascade" }),
  projectId: varchar("project_id"),
  projectCommentId: varchar("project_comment_id"),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  objectUrl: varchar("object_url", { length: 1000 }).notNull(),
  objectPath: varchar("object_path", { length: 1000 }),
  label: varchar("label", { length: 500 }),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadSchema = createInsertSchema(uploads).omit({ id: true, createdAt: true });
export type Upload = typeof uploads.$inferSelect & {
  objectUrl: string;
};
export type InsertUpload = typeof uploads.$inferInsert;

export const emergencyContacts = pgTable("emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 200 }),
  role: varchar("role", { length: 100 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  assignedById: varchar("assigned_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;

export const aiAgentActionEnum = pgEnum("ai_agent_action", ["triage", "schedule", "assign", "suggest_date", "pm_trigger", "fleet_maintenance", "dependency_check"]);
export const aiAgentStatusEnum = pgEnum("ai_agent_status", ["pending_review", "approved", "rejected", "auto_applied"]);

export const aiAgentLogs = pgTable("ai_agent_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: aiAgentActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id", { length: 100 }),
  reasoning: text("reasoning"),
  proposedValue: jsonb("proposed_value"),
  status: aiAgentStatusEnum("status").notNull().default("pending_review"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  modelUsed: varchar("model_used", { length: 50 }),
});

export const insertAiAgentLogSchema = createInsertSchema(aiAgentLogs).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertAiAgentLog = z.infer<typeof insertAiAgentLogSchema>;
export type AiAgentLog = typeof aiAgentLogs.$inferSelect;
