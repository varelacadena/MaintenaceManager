import { sql } from "drizzle-orm";
import { date, doublePrecision, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { tasks } from "./workOrders";

export const taskPurchases = pgTable("task_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  storeName: varchar("store_name", { length: 200 }).notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  purchasedOn: date("purchased_on").notNull(),
  receiptFileName: varchar("receipt_file_name", { length: 500 }),
  receiptFileType: varchar("receipt_file_type", { length: 100 }),
  receiptObjectPath: varchar("receipt_object_path", { length: 1000 }),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdByName: varchar("created_by_name", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskPurchaseSchema = createInsertSchema(taskPurchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TaskPurchase = typeof taskPurchases.$inferSelect;
export type InsertTaskPurchase = z.infer<typeof insertTaskPurchaseSchema>;
