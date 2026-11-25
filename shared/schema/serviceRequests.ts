import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { areas, properties, spaces, subdivisions } from "./facilities";

export const urgencyEnum = pgEnum("urgency", ["low", "medium", "high"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "under_review", "converted_to_task", "rejected"]);

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestNumber: integer("request_number").notNull().default(sql`nextval('service_request_number_seq')`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  urgency: urgencyEnum("urgency").notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  requesterId: varchar("requester_id").references(() => users.id, { onDelete: "set null" }),
  requesterName: varchar("requester_name", { length: 200 }),
  requesterEmail: varchar("requester_email", { length: 200 }),
  requesterPhone: varchar("requester_phone", { length: 30 }),
  propertyId: varchar("property_id").references(() => properties.id, { onDelete: "set null" }),
  propertyName: varchar("property_name", { length: 200 }),
  spaceId: varchar("space_id").references(() => spaces.id),
  areaId: varchar("area_id").references(() => areas.id),
  subdivisionId: varchar("subdivision_id").references(() => subdivisions.id),
  category: varchar("category", { length: 100 }),
  requestedDate: timestamp("requested_date"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  requestNumber: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
