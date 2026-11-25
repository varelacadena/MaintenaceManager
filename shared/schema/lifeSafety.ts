import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { equipment } from "./facilities";
import { users } from "./users";
import { tasks } from "./workOrders";

export const lifeSafetyChecks = pgTable("life_safety_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  equipmentId: varchar("equipment_id").references(() => equipment.id, { onDelete: "set null" }),
  equipmentName: varchar("equipment_name", { length: 200 }).notNull(),
  assetTag: varchar("asset_tag", { length: 100 }),
  category: varchar("category", { length: 50 }).notNull(),
  spaceName: varchar("space_name", { length: 200 }),
  floor: varchar("floor", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
  result: varchar("result", { length: 20 }).notNull().default("pending"),
  problemNote: text("problem_note"),
  checkedById: varchar("checked_by_id").references(() => users.id, { onDelete: "set null" }),
  checkedByName: varchar("checked_by_name", { length: 200 }),
  checkedAt: timestamp("checked_at"),
  repairTaskId: varchar("repair_task_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLifeSafetyCheckSchema = createInsertSchema(lifeSafetyChecks).omit({
  id: true,
  createdAt: true,
});
export type InsertLifeSafetyCheck = z.infer<typeof insertLifeSafetyCheckSchema>;
export type LifeSafetyCheck = typeof lifeSafetyChecks.$inferSelect;
