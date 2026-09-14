import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  timestamp,
  integer,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";

export const studentTimeEntries = pgTable(
  "student_time_entries",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: varchar("student_id").references(() => users.id, { onDelete: "set null" }),
    studentName: varchar("student_name", { length: 200 }).notNull(),
    supervisorId: varchar("supervisor_id").references(() => users.id, { onDelete: "set null" }),
    supervisorName: varchar("supervisor_name", { length: 200 }).notNull(),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }).notNull().defaultNow(),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("student_time_entries_open_session")
      .on(table.studentId)
      .where(sql`${table.clockOutAt} is null and ${table.studentId} is not null`),
    index("idx_student_time_entries_student").on(table.studentId, table.clockInAt),
    index("idx_student_time_entries_supervisor").on(table.supervisorId, table.clockInAt),
    index("idx_student_time_entries_clock_in").on(table.clockInAt),
  ],
);

export const insertStudentTimeEntrySchema = createInsertSchema(studentTimeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudentTimeEntry = z.infer<typeof insertStudentTimeEntrySchema>;
export type StudentTimeEntry = typeof studentTimeEntries.$inferSelect;

export const studentDailyRecaps = pgTable(
  "student_daily_recaps",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: varchar("student_id").references(() => users.id, { onDelete: "set null" }),
    studentName: varchar("student_name", { length: 200 }).notNull(),
    timeEntryId: varchar("time_entry_id")
      .notNull()
      .references(() => studentTimeEntries.id, { onDelete: "cascade" }),
    recapDate: date("recap_date").notNull(),
    whatIDid: text("what_i_did").notNull(),
    whatILearned: text("what_i_learned").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_student_recaps_student_date").on(table.studentId, table.recapDate),
    index("idx_student_recaps_date").on(table.recapDate),
    index("idx_student_recaps_time_entry").on(table.timeEntryId),
  ],
);

export const insertStudentDailyRecapSchema = createInsertSchema(studentDailyRecaps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudentDailyRecap = z.infer<typeof insertStudentDailyRecapSchema>;
export type StudentDailyRecap = typeof studentDailyRecaps.$inferSelect;

export const studentTimeEditRequests = pgTable(
  "student_time_edit_requests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: varchar("student_id").references(() => users.id, { onDelete: "set null" }),
    studentName: varchar("student_name", { length: 200 }).notNull(),
    timeEntryId: varchar("time_entry_id").references(() => studentTimeEntries.id, { onDelete: "cascade" }),
    requestedClockInAt: timestamp("requested_clock_in_at", { withTimezone: true }).notNull(),
    requestedClockOutAt: timestamp("requested_clock_out_at", { withTimezone: true }),
    originalClockInAt: timestamp("original_clock_in_at", { withTimezone: true }).notNull(),
    originalClockOutAt: timestamp("original_clock_out_at", { withTimezone: true }),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    adminNote: text("admin_note"),
    reviewedById: varchar("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
    reviewedByName: varchar("reviewed_by_name", { length: 200 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("student_time_edit_requests_pending_entry")
      .on(table.timeEntryId)
      .where(sql`${table.status} = 'pending' and ${table.timeEntryId} is not null`),
    index("idx_student_time_edit_requests_student").on(table.studentId, table.createdAt),
    index("idx_student_time_edit_requests_status").on(table.status, table.createdAt),
    index("idx_student_time_edit_requests_entry").on(table.timeEntryId),
  ],
);

export const insertStudentTimeEditRequestSchema = createInsertSchema(studentTimeEditRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudentTimeEditRequest = z.infer<typeof insertStudentTimeEditRequestSchema>;
export type StudentTimeEditRequestRow = typeof studentTimeEditRequests.$inferSelect;
