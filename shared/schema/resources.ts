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
import { properties, equipment } from "./facilities";

export const resourceCategories = pgTable("resource_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 30 }).notNull().default("gray"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResourceCategorySchema = createInsertSchema(resourceCategories).omit({ id: true, createdAt: true });
export type InsertResourceCategory = z.infer<typeof insertResourceCategorySchema>;
export type ResourceCategory = typeof resourceCategories.$inferSelect;

export const resourceFolders = pgTable("resource_folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResourceFolderSchema = createInsertSchema(resourceFolders).omit({ id: true, createdAt: true });
export type InsertResourceFolder = z.infer<typeof insertResourceFolderSchema>;
export type ResourceFolder = typeof resourceFolders.$inferSelect;

export const resourceTypeEnum = pgEnum("resource_type", ["video", "document", "image", "link"]);

export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  type: resourceTypeEnum("type").notNull(),
  url: text("url").notNull(),
  objectPath: text("object_path"),
  fileName: varchar("file_name", { length: 255 }),
  categoryId: varchar("category_id").references(() => resourceCategories.id, { onDelete: "set null" }),
  folderId: varchar("folder_id").references(() => resourceFolders.id, { onDelete: "set null" }),
  equipmentId: varchar("equipment_id").references(() => equipment.id, { onDelete: "set null" }),
  equipmentCategory: varchar("equipment_category", { length: 50 }),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResourceSchema = createInsertSchema(resources).omit({ id: true, createdAt: true });
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

export const propertyResources = pgTable("property_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  resourceId: varchar("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow(),
});

export type PropertyResource = typeof propertyResources.$inferSelect;
