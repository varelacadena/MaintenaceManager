import { sql } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  email: varchar("email"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role", { length: 20 }).notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const pendingUserStatusEnum = pgEnum("pending_user_status", ["pending", "approved", "denied", "expired"]);

export const pendingUsers = pgTable("pending_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull(),
  password: varchar("password").notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  requestedRole: varchar("requested_role", { length: 20 }).notNull().default("staff"),
  status: pendingUserStatusEnum("status").notNull().default("pending"),
  denialReason: text("denial_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
});

export const insertPendingUserSchema = createInsertSchema(pendingUsers).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  status: true,
  denialReason: true,
});
export type InsertPendingUser = z.infer<typeof insertPendingUserSchema>;
export type PendingUser = typeof pendingUsers.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const availabilitySchedules = pgTable("availability_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(),
  endTime: varchar("end_time", { length: 5 }).notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAvailabilityScheduleSchema = createInsertSchema(availabilitySchedules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAvailabilitySchedule = z.infer<typeof insertAvailabilityScheduleSchema>;
export type AvailabilitySchedule = typeof availabilitySchedules.$inferSelect;

export const userSkills = pgTable("user_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  skillCategory: varchar("skill_category", { length: 50 }).notNull(),
  proficiencyLevel: varchar("proficiency_level", { length: 20 }).notNull().default("basic"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSkillSchema = createInsertSchema(userSkills).omit({ id: true, createdAt: true });
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type UserSkill = typeof userSkills.$inferSelect;
