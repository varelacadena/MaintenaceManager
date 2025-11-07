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
  role: varchar("role", { length: 20 }).notNull().default("staff"), // admin, maintenance, staff
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
  cost: varchar("cost", { length: 20 }), // cost per unit
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
export const requestStatusEnum = pgEnum("request_status", ["submitted", "under_review", "converted_to_task", "rejected"]);

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  urgency: urgencyEnum("urgency").notNull(),
  status: requestStatusEnum("status").notNull().default("submitted"),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  areaId: varchar("area_id").references(() => areas.id),
  subdivisionId: varchar("subdivision_id").references(() => subdivisions.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks (created from reviewed requests, managed by admin/maintenance)
export const taskTypeEnum = pgEnum("task_type", ["one_time", "recurring", "reminder"]);
export const taskStatusEnum = pgEnum("task_status", ["not_started", "in_progress", "completed", "on_hold"]);

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").references(() => serviceRequests.id),
  propertyId: varchar("property_id"),
  equipmentId: varchar("equipment_id").references(() => equipment.id),
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
  status: taskStatusEnum("status").notNull().default("not_started"),
  onHoldReason: text("on_hold_reason"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
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

// File uploads (can be attached to tasks OR requests)
export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  requestId: varchar("request_id").references(() => serviceRequests.id, { onDelete: "cascade" }),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(), // photo, invoice
  objectPath: varchar("object_path", { length: 500 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadSchema = createInsertSchema(uploads).omit({ id: true, createdAt: true });
export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;

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

// Equipment (linked to properties)
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  requestsCreated: many(serviceRequests, { relationName: "requester" }),
  tasksCreated: many(tasks, { relationName: "task_creator" }),
  tasksAssigned: many(tasks, { relationName: "task_assignee" }),
  timeEntries: many(timeEntries),
  messages: many(messages),
  uploads: many(uploads),
  taskNotes: many(taskNotes),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  tasks: many(tasks),
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
  property: one(properties, {
    fields: [tasks.propertyId],
    references: [properties.id],
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
  uploads: many(uploads),
  taskNotes: many(taskNotes),
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

export const propertiesRelations = relations(properties, ({ many }) => ({
  equipment: many(equipment),
  tasks: many(tasks),
}));

export const equipmentRelations = relations(equipment, ({ one }) => ({
  property: one(properties, {
    fields: [equipment.propertyId],
    references: [properties.id],
  }),
}));