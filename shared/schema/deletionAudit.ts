import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const deletionAuditLog = pgTable(
  "deletion_audit_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id").notNull(),
    entityLabel: varchar("entity_label", { length: 500 }),
    deletedById: varchar("deleted_by_id").notNull().references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
    snapshot: jsonb("snapshot").notNull().default({}),
  },
  (table) => [
    index("idx_deletion_audit_entity").on(table.entityType, table.entityId),
    index("idx_deletion_audit_deleted_by").on(table.deletedById, table.deletedAt),
  ],
);

export const insertDeletionAuditLogSchema = createInsertSchema(deletionAuditLog).omit({
  id: true,
  deletedAt: true,
});
export type InsertDeletionAuditLog = z.infer<typeof insertDeletionAuditLogSchema>;
export type DeletionAuditLog = typeof deletionAuditLog.$inferSelect;

export const deletedEntityRegistry = pgTable(
  "deleted_entity_registry",
  {
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id").notNull(),
    displayLabel: varchar("display_label", { length: 500 }).notNull(),
    snapshot: jsonb("snapshot").notNull().default({}),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
    deletedById: varchar("deleted_by_id").references(() => users.id),
  },
  (table) => [
    primaryKey({ columns: [table.entityType, table.entityId] }),
    index("idx_deleted_entity_registry_deleted_at").on(table.deletedAt),
  ],
);

export const insertDeletedEntityRegistrySchema = createInsertSchema(deletedEntityRegistry).omit({
  deletedAt: true,
});
export type InsertDeletedEntityRegistry = z.infer<typeof insertDeletedEntityRegistrySchema>;
export type DeletedEntityRegistry = typeof deletedEntityRegistry.$inferSelect;
