import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { properties, spaces } from "./facilities";

export const urgencyEnum = pgEnum("urgency", ["low", "medium", "high"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "under_review", "converted_to_task", "rejected"]);

export const areas = pgTable("areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAreaSchema = createInsertSchema(areas).omit({ id: true, createdAt: true });
export type InsertArea = z.infer<typeof insertAreaSchema>;
export type Area = typeof areas.$inferSelect;

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

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
