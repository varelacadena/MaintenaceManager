import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { properties, spaces } from "./facilities";
import { areas } from "./serviceRequests";
import { vendors } from "./vendors";
import { tasks } from "./workOrders";

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled"
]);

export const projectPriorityEnum = pgEnum("project_priority", [
  "low",
  "medium",
  "high",
  "critical"
]);

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  propertyId: varchar("property_id").references(() => properties.id),
  spaceId: varchar("space_id").references(() => spaces.id),
  areaId: varchar("area_id").references(() => areas.id),
  startDate: timestamp("start_date"),
  targetEndDate: timestamp("target_end_date"),
  actualEndDate: timestamp("actual_end_date"),
  budgetAmount: doublePrecision("budget_amount").default(0),
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualEndDate: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export const projectTeamRoleEnum = pgEnum("project_team_role", [
  "manager",
  "lead",
  "technician",
  "support"
]);

export const projectTeamMembers = pgTable("project_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: projectTeamRoleEnum("role").notNull().default("technician"),
  allocationHours: integer("allocation_hours"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectTeamMemberSchema = createInsertSchema(projectTeamMembers).omit({
  id: true,
  createdAt: true,
});
export type InsertProjectTeamMember = z.infer<typeof insertProjectTeamMemberSchema>;
export type ProjectTeamMember = typeof projectTeamMembers.$inferSelect;

export const projectVendorRoleEnum = pgEnum("project_vendor_role", [
  "primary",
  "subcontractor",
  "consultant",
  "supplier"
]);

export const projectVendors = pgTable("project_vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  role: projectVendorRoleEnum("role").notNull().default("primary"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectVendorSchema = createInsertSchema(projectVendors).omit({
  id: true,
  createdAt: true,
});
export type InsertProjectVendor = z.infer<typeof insertProjectVendorSchema>;
export type ProjectVendor = typeof projectVendors.$inferSelect;

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "approved",
  "rejected"
]);

export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  vendorName: varchar("vendor_name", { length: 200 }),
  estimatedCost: doublePrecision("estimated_cost").notNull().default(0),
  status: quoteStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const quoteAttachments = pgTable("quote_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  storageUrl: varchar("storage_url", { length: 1000 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertQuoteAttachmentSchema = createInsertSchema(quoteAttachments).omit({
  id: true,
  uploadedAt: true,
});
export type InsertQuoteAttachment = z.infer<typeof insertQuoteAttachmentSchema>;
export type QuoteAttachment = typeof quoteAttachments.$inferSelect;

export const projectComments = pgTable("project_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({ id: true, createdAt: true });
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;
