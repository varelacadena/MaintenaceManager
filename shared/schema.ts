import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
  index,
  boolean,
  doublePrecision,
  uuid,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(), // hashed password
  email: varchar("email"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role", { length: 20 }).notNull().default("staff"), // admin, technician, staff, student
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Vendors
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Inventory items
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(0),
  unit: varchar("unit", { length: 50 }), // e.g., "pcs", "boxes", "gallons"
  location: varchar("location", { length: 200 }), // storage location
  minQuantity: integer("min_quantity").default(0), // for low stock alerts
  cost: numeric("cost", { precision: 10, scale: 2 }), // cost per unit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// Maintenance areas (predefined categories)
export const areas = pgTable("areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAreaSchema = createInsertSchema(areas).omit({ id: true, createdAt: true });
export type InsertArea = z.infer<typeof insertAreaSchema>;
export type Area = typeof areas.$inferSelect;

// Subdivisions (hierarchical organization)
export const subdivisions = pgTable("subdivisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  areaId: varchar("area_id").notNull().references(() => areas.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references((): any => subdivisions.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  gpsLatitude: varchar("gps_latitude", { length: 50 }),
  gpsLongitude: varchar("gps_longitude", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubdivisionSchema = createInsertSchema(subdivisions).omit({ id: true, createdAt: true });
export type InsertSubdivision = z.infer<typeof insertSubdivisionSchema>;
export type Subdivision = typeof subdivisions.$inferSelect;

// Service requests (simplified - staff submissions that need review)
export const urgencyEnum = pgEnum("urgency", ["low", "medium", "high"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "under_review", "converted_to_task", "rejected"]);

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  urgency: urgencyEnum("urgency").notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  propertyId: varchar("property_id").references(() => properties.id),
  spaceId: varchar("space_id").references(() => spaces.id),
  areaId: varchar("area_id").references(() => areas.id),
  subdivisionId: varchar("subdivision_id").references(() => subdivisions.id),
  category: varchar("category", { length: 100 }),
  requestedDate: timestamp("requested_date"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks (created from reviewed requests, managed by admin)
export const taskTypeEnum = pgEnum("task_type", ["one_time", "recurring", "reminder", "project"]);
export const taskStatusEnum = pgEnum("task_status", ["not_started", "needs_estimate", "waiting_approval", "ready", "in_progress", "completed", "on_hold"]);
export const contactTypeEnum = pgEnum("contact_type", ["requester", "staff", "other"]);
// Executor type determines whether task is for Student or Technician
export const executorTypeEnum = pgEnum("executor_type", ["student", "technician"]);
// Estimate status for tasks requiring internal estimates
export const estimateStatusEnum = pgEnum("estimate_status", ["none", "needs_estimate", "waiting_approval", "approved"]);

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").references(() => serviceRequests.id, { onDelete: "set null" }),
  projectId: varchar("project_id"), // Links task to a project (forward reference, relation defined later)
  propertyId: varchar("property_id").references(() => properties.id),
  spaceId: varchar("space_id").references(() => spaces.id), // For tasks in building spaces
  equipmentId: varchar("equipment_id").references(() => equipment.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id), // For vehicle-related tasks
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
  executorType: executorTypeEnum("executor_type"), // student or technician - determines task visibility and form
  assignedPool: varchar("assigned_pool", { length: 50 }), // "student_pool" or "technician_pool" for unassigned tasks
  status: taskStatusEnum("task_status").notNull().default("not_started"),
  onHoldReason: text("on_hold_reason"),
  recurringFrequency: text("recurring_frequency"), // daily, weekly, monthly, yearly
  recurringInterval: integer("recurring_interval"), // every X days/weeks/months
  recurringEndDate: text("recurring_end_date"),
  contactType: contactTypeEnum("contact_type"),
  contactStaffId: varchar("contact_staff_id").references(() => users.id),
  contactName: varchar("contact_name", { length: 200 }),
  contactEmail: varchar("contact_email", { length: 200 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  // Student task specific fields
  instructions: text("instructions"), // Required instructions for student tasks
  requiresPhoto: boolean("requires_photo").default(false), // Whether photo upload is required for completion
  // Internal estimate fields
  requiresEstimate: boolean("requires_estimate").default(false), // Whether task requires internal estimate
  estimateStatus: estimateStatusEnum("estimate_status").default("none"), // Estimate workflow status
  approvedQuoteId: varchar("approved_quote_id"), // Reference to approved internal quote
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  estimatedHours: doublePrecision("estimated_hours"),
  requiredSkill: varchar("required_skill", { length: 100 }),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  actualCompletionDate: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Time tracking (linked to tasks, not requests)
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

// Parts used (linked to tasks, not requests)
export const partsUsed = pgTable("parts_used", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  inventoryItemId: varchar("inventory_item_id").references(() => inventoryItems.id), // Link to inventory
  partName: varchar("part_name", { length: 200 }).notNull(),
  quantity: integer("quantity").notNull(),
  cost: doublePrecision("cost").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPartUsedSchema = createInsertSchema(partsUsed).omit({ id: true, createdAt: true });
export type InsertPartUsed = z.infer<typeof insertPartUsedSchema>;
export type PartUsed = typeof partsUsed.$inferSelect;

// Messages (can be on requests OR tasks for communication)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  requestId: varchar("request_id").references(() => serviceRequests.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Uploads (can be on requests, tasks, equipment, or vehicle logs for attachments)
export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  requestId: varchar("request_id").references(() => serviceRequests.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id").references(() => equipment.id, { onDelete: "cascade" }),
  vehicleCheckOutLogId: varchar("vehicle_check_out_log_id").references(() => vehicleCheckOutLogs.id, { onDelete: "cascade" }),
  vehicleCheckInLogId: varchar("vehicle_check_in_log_id").references(() => vehicleCheckInLogs.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  objectUrl: varchar("object_url", { length: 1000 }).notNull(),
  objectPath: varchar("object_path", { length: 1000 }),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadSchema = createInsertSchema(uploads).omit({ id: true, createdAt: true });
export type Upload = typeof uploads.$inferSelect & {
  objectUrl: string; // Ensure this maps correctly
};
export type InsertUpload = typeof uploads.$inferInsert;

// Task notes (linked to tasks, not requests)
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

// Task checklists - legacy flat model (kept for backward compatibility)
export const taskChecklists = pgTable("task_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 500 }).notNull(),
  isCompleted: boolean("is_completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskChecklistSchema = createInsertSchema(taskChecklists).omit({ id: true, createdAt: true });
export type InsertTaskChecklist = z.infer<typeof insertTaskChecklistSchema>;
export type TaskChecklist = typeof taskChecklists.$inferSelect;

// Named/grouped checklists - two-tier model for classified checklists
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

// Checklist templates - reusable checklist patterns
export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  items: jsonb("items").notNull().default([]), // Array of { text: string, sortOrder: number }
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;
export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;

// Properties (map-based property system)
export const propertyTypeEnum = pgEnum("property_type", [
  "building",
  "lawn",
  "parking",
  "recreation",
  "utility",
  "road",
  "other"
]);

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  type: propertyTypeEnum("type").notNull(),
  coordinates: jsonb("coordinates").notNull(), // GeoJSON geometry (Polygon, Point, etc.)
  address: text("address"),
  imageUrl: varchar("image_url", { length: 500 }),
  lastWorkDate: timestamp("last_work_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Spaces (rooms within buildings - bathrooms, classrooms, offices, etc.)
export const spaces = pgTable("spaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  floor: varchar("floor", { length: 50 }), // e.g., "1st Floor", "Basement", "2nd Floor"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSpaceSchema = createInsertSchema(spaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSpace = z.infer<typeof insertSpaceSchema>;
export type Space = typeof spaces.$inferSelect;

// Equipment (linked to spaces for buildings, or directly to properties for flat properties)
export const equipmentCategoryEnum = pgEnum("equipment_category", [
  "appliances",
  "hvac",
  "structure",
  "plumbing",
  "electric",
  "landscaping",
  "diagrams",
  "other"
]);

export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  spaceId: varchar("space_id").references(() => spaces.id, { onDelete: "cascade" }), // Optional - for equipment in building spaces
  category: equipmentCategoryEnum("category").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  serialNumber: varchar("serial_number", { length: 200 }),
  condition: varchar("condition", { length: 100 }), // good, fair, poor, needs replacement
  notes: text("notes"),
  imageUrl: varchar("image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Equipment = typeof equipment.$inferSelect;

// Vehicle maintenance logs table
export const vehicleMaintenanceLogs = pgTable("vehicle_maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  maintenanceDate: timestamp("maintenance_date").notNull().defaultNow(),
  type: varchar("type", { length: 100 }).notNull(), // e.g., "Oil Change", "Repair", "Inspection"
  description: text("description").notNull(),
  cost: doublePrecision("cost").default(0),
  mileageAtMaintenance: integer("mileage_at_maintenance"),
  performedBy: varchar("performed_by", { length: 200 }), // Vendor or staff name
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVehicleMaintenanceLogSchema = createInsertSchema(vehicleMaintenanceLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertVehicleMaintenanceLog = z.infer<typeof insertVehicleMaintenanceLogSchema>;
export type VehicleMaintenanceLog = typeof vehicleMaintenanceLogs.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  requestsCreated: many(serviceRequests, { relationName: "requester" }),
  tasksCreated: many(tasks, { relationName: "task_creator" }),
  tasksAssigned: many(tasks, { relationName: "task_assignee" }),
  timeEntries: many(timeEntries),
  messages: many(messages),
  taskNotes: many(taskNotes),
  uploads: many(uploads),
  vehicleReservations: many(vehicleReservations),
  vehicleCheckOutLogs: many(vehicleCheckOutLogs),
  vehicleCheckInLogs: many(vehicleCheckInLogs),
}));

export const areasRelations = relations(areas, ({ many }) => ({
  subdivisions: many(subdivisions),
  serviceRequests: many(serviceRequests),
  tasks: many(tasks),
}));

export const subdivisionsRelations = relations(subdivisions, ({ one, many }) => ({
  area: one(areas, {
    fields: [subdivisions.areaId],
    references: [areas.id],
  }),
  parent: one(subdivisions, {
    fields: [subdivisions.parentId],
    references: [subdivisions.id],
    relationName: "subdivision_parent",
  }),
  children: many(subdivisions, { relationName: "subdivision_parent" }),
  serviceRequests: many(serviceRequests),
  tasks: many(tasks),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  requester: one(users, {
    fields: [serviceRequests.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  property: one(properties, {
    fields: [serviceRequests.propertyId],
    references: [properties.id],
  }),
  space: one(spaces, {
    fields: [serviceRequests.spaceId],
    references: [spaces.id],
  }),
  area: one(areas, {
    fields: [serviceRequests.areaId],
    references: [areas.id],
  }),
  subdivision: one(subdivisions, {
    fields: [serviceRequests.subdivisionId],
    references: [subdivisions.id],
  }),
  tasks: many(tasks),
  messages: many(messages),
  uploads: many(uploads),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  request: one(serviceRequests, {
    fields: [tasks.requestId],
    references: [serviceRequests.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  property: one(properties, {
    fields: [tasks.propertyId],
    references: [properties.id],
  }),
  space: one(spaces, {
    fields: [tasks.spaceId],
    references: [spaces.id],
  }),
  equipment: one(equipment, {
    fields: [tasks.equipmentId],
    references: [equipment.id],
  }),
  vehicle: one(vehicles, {
    fields: [tasks.vehicleId],
    references: [vehicles.id],
  }),
  creator: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "task_creator",
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "task_assignee",
  }),
  assignedVendor: one(vendors, {
    fields: [tasks.assignedVendorId],
    references: [vendors.id],
  }),
  area: one(areas, {
    fields: [tasks.areaId],
    references: [areas.id],
  }),
  subdivision: one(subdivisions, {
    fields: [tasks.subdivisionId],
    references: [subdivisions.id],
  }),
  timeEntries: many(timeEntries),
  partsUsed: many(partsUsed),
  messages: many(messages),
  taskNotes: many(taskNotes),
  uploads: many(uploads),
  checklists: many(taskChecklists),
  checklistGroups: many(taskChecklistGroups),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
}));

export const partsUsedRelations = relations(partsUsed, ({ one }) => ({
  task: one(tasks, {
    fields: [partsUsed.taskId],
    references: [tasks.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [partsUsed.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  task: one(tasks, {
    fields: [messages.taskId],
    references: [tasks.id],
  }),
  request: one(serviceRequests, {
    fields: [messages.requestId],
    references: [serviceRequests.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const uploadsRelations = relations(uploads, ({ one }) => ({
  task: one(tasks, {
    fields: [uploads.taskId],
    references: [tasks.id],
  }),
  request: one(serviceRequests, {
    fields: [uploads.requestId],
    references: [serviceRequests.id],
  }),
  equipment: one(equipment, {
    fields: [uploads.equipmentId],
    references: [equipment.id],
  }),
  vehicleCheckOutLog: one(vehicleCheckOutLogs, {
    fields: [uploads.vehicleCheckOutLogId],
    references: [vehicleCheckOutLogs.id],
  }),
  vehicleCheckInLog: one(vehicleCheckInLogs, {
    fields: [uploads.vehicleCheckInLogId],
    references: [vehicleCheckInLogs.id],
  }),
  uploadedBy: one(users, {
    fields: [uploads.uploadedById],
    references: [users.id],
  }),
}));

export const taskNotesRelations = relations(taskNotes, ({ one }) => ({
  task: one(tasks, {
    fields: [taskNotes.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskNotes.userId],
    references: [users.id],
  }),
}));

export const taskChecklistsRelations = relations(taskChecklists, ({ one }) => ({
  task: one(tasks, {
    fields: [taskChecklists.taskId],
    references: [tasks.id],
  }),
}));

export const taskChecklistGroupsRelations = relations(taskChecklistGroups, ({ one, many }) => ({
  task: one(tasks, {
    fields: [taskChecklistGroups.taskId],
    references: [tasks.id],
  }),
  items: many(taskChecklistItems),
}));

export const taskChecklistItemsRelations = relations(taskChecklistItems, ({ one }) => ({
  group: one(taskChecklistGroups, {
    fields: [taskChecklistItems.groupId],
    references: [taskChecklistGroups.id],
  }),
}));

export const propertiesRelations = relations(properties, ({ many }) => ({
  spaces: many(spaces),
  equipment: many(equipment),
  tasks: many(tasks),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  property: one(properties, {
    fields: [spaces.propertyId],
    references: [properties.id],
  }),
  equipment: many(equipment),
  tasks: many(tasks),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  property: one(properties, {
    fields: [equipment.propertyId],
    references: [properties.id],
  }),
  space: one(spaces, {
    fields: [equipment.spaceId],
    references: [spaces.id],
  }),
  uploads: many(uploads),
}));

// Vehicle Fleet Management

// Vehicle status enum
export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "available",
  "reserved",
  "in_use",
  "needs_cleaning",
  "needs_maintenance",
  "out_of_service"
]);

// Reservation status enum
export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "approved",
  "active",
  "completed",
  "cancelled"
]);

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  year: integer("year").notNull(),
  vehicleId: varchar("vehicle_id", { length: 50 }).notNull().unique(), // Custom ID like "VEH-001"
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

// Vehicle reservations table
export const vehicleReservations = pgTable("vehicle_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  purpose: varchar("purpose", { length: 200 }).notNull(),
  passengerCount: integer("passenger_count").notNull(),
  notes: text("notes"),
  keyPickupMethod: varchar("key_pickup_method", { length: 50 }),
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

// Vehicle check-out logs table
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

// Vehicle check-in logs table
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

// Vehicle maintenance schedules table
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

// Vehicle document types enum
export const vehicleDocumentTypeEnum = pgEnum("vehicle_document_type", [
  "insurance",
  "annual_inspection",
  "registration",
  "other"
]);

// Vehicle documents table (for tracking expiration dates)
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

// Vehicle relations
export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  reservations: many(vehicleReservations),
  checkOutLogs: many(vehicleCheckOutLogs),
  checkInLogs: many(vehicleCheckInLogs),
  maintenanceSchedules: many(vehicleMaintenanceSchedules),
  maintenanceLogs: many(vehicleMaintenanceLogs),
  documents: many(vehicleDocuments),
  tasks: many(tasks),
}));

export const vehicleDocumentsRelations = relations(vehicleDocuments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleDocuments.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleReservationsRelations = relations(vehicleReservations, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleReservations.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [vehicleReservations.userId],
    references: [users.id],
  }),
  checkOutLogs: many(vehicleCheckOutLogs),
}));

export const vehicleCheckOutLogsRelations = relations(vehicleCheckOutLogs, ({ one, many }) => ({
  reservation: one(vehicleReservations, {
    fields: [vehicleCheckOutLogs.reservationId],
    references: [vehicleReservations.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehicleCheckOutLogs.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [vehicleCheckOutLogs.userId],
    references: [users.id],
  }),
  checkInLog: one(vehicleCheckInLogs),
  uploads: many(uploads),
}));

export const vehicleCheckInLogsRelations = relations(vehicleCheckInLogs, ({ one, many }) => ({
  checkOutLog: one(vehicleCheckOutLogs, {
    fields: [vehicleCheckInLogs.checkOutLogId],
    references: [vehicleCheckOutLogs.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehicleCheckInLogs.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [vehicleCheckInLogs.userId],
    references: [users.id],
  }),
  uploads: many(uploads),
}));

export const vehicleMaintenanceSchedulesRelations = relations(vehicleMaintenanceSchedules, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleMaintenanceSchedules.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleMaintenanceLogsRelations = relations(vehicleMaintenanceLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleMaintenanceLogs.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  tasks: many(tasks),
}));

// Emergency contacts (after-hours contacts assigned by admin for staff view)
export const emergencyContacts = pgTable("emergency_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 200 }),
  role: varchar("role", { length: 100 }), // e.g., "On-Call Supervisor"
  notes: text("notes"), // Instructions like "Call first, text if no answer"
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

export const emergencyContactsRelations = relations(emergencyContacts, ({ one }) => ({
  assignedBy: one(users, {
    fields: [emergencyContacts.assignedById],
    references: [users.id],
  }),
}));

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
  "document_expiration",
  "task_reminder",
  "task_due",
  "task_overdue",
  "system"
]);

// In-app notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // null = all users
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }), // Optional link to related item
  relatedId: varchar("related_id"), // ID of related entity (task, document, etc.)
  relatedType: varchar("related_type", { length: 50 }), // Type of related entity
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// EMAIL MANAGEMENT SYSTEM
// ============================================================================

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 100 }).notNull(),
  trigger: varchar("trigger", { length: 100 }),
  name: varchar("name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  availableVariables: text("available_variables").array(),
  isCustom: boolean("is_custom").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  updatedAt: true,
});
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export const emailLogStatusEnum = pgEnum("email_log_status", [
  "sent",
  "failed",
  "skipped",
]);

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateType: varchar("template_type", { length: 100 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 300 }).notNull(),
  recipientName: varchar("recipient_name", { length: 200 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  status: emailLogStatusEnum("email_log_status").notNull().default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNotificationSettingSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertNotificationSetting = z.infer<typeof insertNotificationSettingSchema>;
export type NotificationSetting = typeof notificationSettings.$inferSelect;

// ============================================================================
// PROJECT MANAGEMENT SYSTEM
// ============================================================================

// Project status enum
export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled"
]);

// Project priority enum
export const projectPriorityEnum = pgEnum("project_priority", [
  "low",
  "medium",
  "high",
  "critical"
]);

// Projects table - groups multiple tasks under one project
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("planning"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  propertyId: uuid("property_id").references(() => properties.id),
  spaceId: uuid("space_id").references(() => spaces.id),
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

// Project team member role enum
export const projectTeamRoleEnum = pgEnum("project_team_role", [
  "manager",
  "lead",
  "technician",
  "support"
]);

// Project team members - links users to projects
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

// Project vendor role enum
export const projectVendorRoleEnum = pgEnum("project_vendor_role", [
  "primary",
  "subcontractor",
  "consultant",
  "supplier"
]);

// Project vendors - links vendors to projects
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

// Quote status enum - simplified for internal quotes
export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "approved",
  "rejected"
]);

// Internal Quotes - for task estimates (simplified model)
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  vendorName: varchar("vendor_name", { length: 200 }), // Optional vendor name for comparison
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

// Quote Attachments - files attached to quotes
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


// Project relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  property: one(properties, {
    fields: [projects.propertyId],
    references: [properties.id],
  }),
  area: one(areas, {
    fields: [projects.areaId],
    references: [areas.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  teamMembers: many(projectTeamMembers),
  projectVendors: many(projectVendors),
  tasks: many(tasks),
}));

export const projectTeamMembersRelations = relations(projectTeamMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectTeamMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectTeamMembers.userId],
    references: [users.id],
  }),
}));

export const projectVendorsRelations = relations(projectVendors, ({ one }) => ({
  project: one(projects, {
    fields: [projectVendors.projectId],
    references: [projects.id],
  }),
  vendor: one(vendors, {
    fields: [projectVendors.vendorId],
    references: [vendors.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  task: one(tasks, {
    fields: [quotes.taskId],
    references: [tasks.id],
  }),
  createdBy: one(users, {
    fields: [quotes.createdById],
    references: [users.id],
  }),
  attachments: many(quoteAttachments),
}));

export const quoteAttachmentsRelations = relations(quoteAttachments, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteAttachments.quoteId],
    references: [quotes.id],
  }),
}));

// ─── AI Agent Infrastructure ────────────────────────────────────────────────

// T011: Availability schedules
export const availabilitySchedules = pgTable("availability_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: varchar("start_time", { length: 5 }).notNull(), // "HH:MM" 24h format
  endTime: varchar("end_time", { length: 5 }).notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAvailabilityScheduleSchema = createInsertSchema(availabilitySchedules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAvailabilitySchedule = z.infer<typeof insertAvailabilityScheduleSchema>;
export type AvailabilitySchedule = typeof availabilitySchedules.$inferSelect;

// T012: User skills and certifications
export const userSkills = pgTable("user_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  skillCategory: varchar("skill_category", { length: 50 }).notNull(), // electrical, plumbing, hvac, mechanical, general
  proficiencyLevel: varchar("proficiency_level", { length: 20 }).notNull().default("basic"), // basic, intermediate, advanced
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSkillSchema = createInsertSchema(userSkills).omit({ id: true, createdAt: true });
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type UserSkill = typeof userSkills.$inferSelect;

// T013: Estimated effort hours added to tasks (column added via migration)
// T014: Task dependencies
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

// T015: SLA configurations
export const slaConfigs = pgTable("sla_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  urgencyLevel: varchar("urgency_level", { length: 20 }).notNull(), // low, medium, high
  responseHours: integer("response_hours").notNull().default(24),
  resolutionHours: integer("resolution_hours").notNull().default(72),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSlaConfigSchema = createInsertSchema(slaConfigs).omit({ id: true, updatedAt: true });
export type InsertSlaConfig = z.infer<typeof insertSlaConfigSchema>;
export type SlaConfig = typeof slaConfigs.$inferSelect;

// T018: AI Agent audit log
export const aiAgentActionEnum = pgEnum("ai_agent_action", ["triage", "schedule", "assign", "suggest_date", "pm_trigger", "fleet_maintenance", "dependency_check"]);
export const aiAgentStatusEnum = pgEnum("ai_agent_status", ["pending_review", "approved", "rejected", "auto_applied"]);

export const aiAgentLogs = pgTable("ai_agent_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: aiAgentActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // task, service_request, vehicle, equipment
  entityId: varchar("entity_id", { length: 100 }),
  reasoning: text("reasoning"),
  proposedValue: jsonb("proposed_value"),
  status: aiAgentStatusEnum("status").notNull().default("pending_review"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiAgentLogSchema = createInsertSchema(aiAgentLogs).omit({ id: true, createdAt: true, reviewedAt: true });
export type InsertAiAgentLog = z.infer<typeof insertAiAgentLogSchema>;
export type AiAgentLog = typeof aiAgentLogs.$inferSelect;
