import {
  users,
  availabilitySchedules,
  userSkills,
  pendingUsers,
  passwordResetTokens,
  type User,
  type UpsertUser,
  type AvailabilitySchedule,
  type InsertAvailabilitySchedule,
  type UserSkill,
  type InsertUserSkill,
  type PendingUser,
  type InsertPendingUser,
  type PasswordResetToken,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, or, lte } from "drizzle-orm";

export async function getUser(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function upsertUser(userData: UpsertUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(userData)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

export async function updateUserRole(id: string, role: string): Promise<User | undefined> {
  const [user] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
  const [user] = await db
    .update(users)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function updateUser(id: string, userData: {
  username?: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
}): Promise<User | undefined> {
  const [user] = await db
    .update(users)
    .set({ ...userData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

export async function getAllUsers(): Promise<User[]> {
  return await db.select().from(users);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  return user;
}

export async function getUsersByRoles(roles: string[]): Promise<User[]> {
  return await db.select().from(users).where(
    or(...roles.map(role => eq(users.role, role)))
  );
}

export async function createUser(userData: {
  username: string;
  password: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  role: string;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(userData)
    .returning();
  return user;
}

export async function getUserAvailability(userId: string): Promise<AvailabilitySchedule[]> {
  return await db.select().from(availabilitySchedules)
    .where(eq(availabilitySchedules.userId, userId))
    .orderBy(availabilitySchedules.dayOfWeek);
}

export async function upsertUserAvailability(userId: string, schedules: InsertAvailabilitySchedule[]): Promise<AvailabilitySchedule[]> {
  await db.delete(availabilitySchedules).where(eq(availabilitySchedules.userId, userId));
  if (schedules.length === 0) return [];
  return await db.insert(availabilitySchedules).values(schedules).returning();
}

export async function getUserSkills(userId: string): Promise<UserSkill[]> {
  return await db.select().from(userSkills).where(eq(userSkills.userId, userId));
}

export async function createUserSkill(skill: InsertUserSkill): Promise<UserSkill> {
  const [created] = await db.insert(userSkills).values(skill).returning();
  return created;
}

export async function deleteUserSkill(id: string): Promise<void> {
  await db.delete(userSkills).where(eq(userSkills.id, id));
}

export async function getAllUserSkills(): Promise<UserSkill[]> {
  return await db.select().from(userSkills);
}

export async function createResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
  const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
  return row;
}

export async function markResetTokenUsed(token: string): Promise<void> {
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.token, token));
}

export async function getPendingUsers(status?: string): Promise<PendingUser[]> {
  if (status) {
    return await db.select().from(pendingUsers)
      .where(eq(pendingUsers.status, status as any))
      .orderBy(desc(pendingUsers.submittedAt));
  }
  return await db.select().from(pendingUsers)
    .orderBy(desc(pendingUsers.submittedAt));
}

export async function getPendingUser(id: string): Promise<PendingUser | undefined> {
  const [user] = await db.select().from(pendingUsers).where(eq(pendingUsers.id, id));
  return user;
}

export async function getPendingUserByUsername(username: string): Promise<PendingUser | undefined> {
  const [user] = await db.select().from(pendingUsers)
    .where(and(eq(pendingUsers.username, username), eq(pendingUsers.status, "pending")));
  return user;
}

export async function getPendingUserByEmail(email: string): Promise<PendingUser | undefined> {
  const [user] = await db.select().from(pendingUsers)
    .where(and(eq(pendingUsers.email, email), eq(pendingUsers.status, "pending")));
  return user;
}

export async function createPendingUser(data: InsertPendingUser): Promise<PendingUser> {
  const [user] = await db.insert(pendingUsers).values(data).returning();
  return user;
}

export async function updatePendingUser(id: string, data: Partial<PendingUser>): Promise<PendingUser | undefined> {
  const [user] = await db.update(pendingUsers)
    .set(data)
    .where(eq(pendingUsers.id, id))
    .returning();
  return user;
}

export async function deletePendingUser(id: string): Promise<void> {
  await db.delete(pendingUsers).where(eq(pendingUsers.id, id));
}

export async function getPendingUserCount(): Promise<number> {
  const rows = await db.select({ id: pendingUsers.id })
    .from(pendingUsers)
    .where(eq(pendingUsers.status, "pending"));
  return rows.length;
}

export async function expireOldPendingUsers(): Promise<number> {
  const now = new Date();
  const expired = await db.update(pendingUsers)
    .set({ status: "expired" })
    .where(and(
      eq(pendingUsers.status, "pending"),
      lte(pendingUsers.expiresAt, now)
    ))
    .returning();
  return expired.length;
}
