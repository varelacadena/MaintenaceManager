import {
  studentTimeEntries,
  studentDailyRecaps,
  studentTimeEditRequests,
  users,
  type StudentTimeEntry,
  type InsertStudentTimeEntry,
  type StudentDailyRecap,
  type InsertStudentDailyRecap,
  type StudentTimeEditRequestRow,
  type InsertStudentTimeEditRequest,
} from "@shared/schema";
import { db } from "../db";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { computeDurationMinutes, localDateString, MIN_RECAP_LENGTH, startOfNextLocalDay } from "@shared/studentPortal";

export type StudentTimeRange = {
  startDate?: Date;
  endDate?: Date;
};

function applyTimeRange(
  column: typeof studentTimeEntries.clockInAt | typeof studentDailyRecaps.recapDate,
  range?: StudentTimeRange,
) {
  const clauses = [];
  if (range?.startDate) clauses.push(gte(column, range.startDate as never));
  if (range?.endDate) clauses.push(lte(column, range.endDate as never));
  return clauses;
}

export async function getOpenStudentTimeEntry(studentId: string): Promise<StudentTimeEntry | undefined> {
  const [entry] = await db
    .select()
    .from(studentTimeEntries)
    .where(and(eq(studentTimeEntries.studentId, studentId), isNull(studentTimeEntries.clockOutAt)))
    .limit(1);
  return entry;
}

export async function getLatestStudentTimeEntry(studentId: string): Promise<StudentTimeEntry | undefined> {
  const [entry] = await db
    .select()
    .from(studentTimeEntries)
    .where(eq(studentTimeEntries.studentId, studentId))
    .orderBy(desc(studentTimeEntries.clockInAt))
    .limit(1);
  return entry;
}

export async function createStudentTimeEntry(entry: InsertStudentTimeEntry): Promise<StudentTimeEntry> {
  const [created] = await db.insert(studentTimeEntries).values(entry).returning();
  return created;
}

export async function closeOvernightOpenStudentShift(
  studentId: string,
  now: Date = new Date(),
): Promise<StudentTimeEntry | undefined> {
  const open = await getOpenStudentTimeEntry(studentId);
  if (!open?.clockInAt) return undefined;
  if (localDateString(open.clockInAt) >= localDateString(now)) return undefined;
  const clockOutAt = startOfNextLocalDay(open.clockInAt);
  return clockOutStudentTimeEntry(
    open.id,
    clockOutAt,
    computeDurationMinutes(open.clockInAt, clockOutAt),
  );
}

export async function clockOutStudentTimeEntry(
  id: string,
  clockOutAt: Date,
  durationMinutes: number,
): Promise<StudentTimeEntry | undefined> {
  const [updated] = await db
    .update(studentTimeEntries)
    .set({
      clockOutAt,
      durationMinutes,
      updatedAt: new Date(),
    })
    .where(and(eq(studentTimeEntries.id, id), isNull(studentTimeEntries.clockOutAt)))
    .returning();
  return updated;
}

export async function listStudentTimeEntries(
  filters: StudentTimeRange & { studentId?: string } = {},
): Promise<StudentTimeEntry[]> {
  const clauses = [
    ...applyTimeRange(studentTimeEntries.clockInAt, filters),
  ];
  if (filters.studentId) clauses.push(eq(studentTimeEntries.studentId, filters.studentId));

  return db
    .select()
    .from(studentTimeEntries)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(studentTimeEntries.clockInAt));
}

export async function countStudentRecapsOnDate(studentId: string, recapDate: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentDailyRecaps)
    .where(and(eq(studentDailyRecaps.studentId, studentId), eq(studentDailyRecaps.recapDate, recapDate)));
  return row?.count ?? 0;
}

export async function countStudentRecapsForTimeEntry(timeEntryId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentDailyRecaps)
    .where(
      and(
        eq(studentDailyRecaps.timeEntryId, timeEntryId),
        sql`char_length(trim(${studentDailyRecaps.whatIDid})) >= ${MIN_RECAP_LENGTH}`,
        sql`char_length(trim(${studentDailyRecaps.whatILearned})) >= ${MIN_RECAP_LENGTH}`,
      ),
    );
  return row?.count ?? 0;
}

export async function createStudentDailyRecap(recap: InsertStudentDailyRecap): Promise<StudentDailyRecap> {
  const [created] = await db.insert(studentDailyRecaps).values(recap).returning();
  return created;
}

export async function listStudentDailyRecaps(
  filters: StudentTimeRange & { studentId?: string } = {},
): Promise<StudentDailyRecap[]> {
  const clauses = [];
  if (filters.studentId) clauses.push(eq(studentDailyRecaps.studentId, filters.studentId));
  if (filters.startDate) {
    clauses.push(gte(studentDailyRecaps.recapDate, filters.startDate.toISOString().slice(0, 10)));
  }
  if (filters.endDate) {
    clauses.push(lte(studentDailyRecaps.recapDate, filters.endDate.toISOString().slice(0, 10)));
  }

  return db
    .select()
    .from(studentDailyRecaps)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(studentDailyRecaps.recapDate), desc(studentDailyRecaps.createdAt));
}

export async function getStudentDailyRecap(id: string): Promise<StudentDailyRecap | undefined> {
  const [recap] = await db.select().from(studentDailyRecaps).where(eq(studentDailyRecaps.id, id));
  return recap;
}

export async function getStudentTimeEntry(id: string): Promise<StudentTimeEntry | undefined> {
  const [entry] = await db.select().from(studentTimeEntries).where(eq(studentTimeEntries.id, id));
  return entry;
}

export async function updateStudentTimeEntry(
  id: string,
  values: {
    clockInAt: Date;
    clockOutAt: Date | null;
    durationMinutes: number | null;
    supervisorId?: string | null;
    supervisorName?: string;
  },
): Promise<StudentTimeEntry | undefined> {
  const [updated] = await db
    .update(studentTimeEntries)
    .set({
      clockInAt: values.clockInAt,
      clockOutAt: values.clockOutAt,
      durationMinutes: values.durationMinutes,
      ...(values.supervisorId !== undefined ? { supervisorId: values.supervisorId } : {}),
      ...(values.supervisorName !== undefined ? { supervisorName: values.supervisorName } : {}),
      updatedAt: new Date(),
    })
    .where(eq(studentTimeEntries.id, id))
    .returning();
  return updated;
}

export async function deleteStudentTimeEntry(id: string): Promise<StudentTimeEntry | undefined> {
  const [deleted] = await db.delete(studentTimeEntries).where(eq(studentTimeEntries.id, id)).returning();
  return deleted;
}

export async function createStudentTimeEditRequest(
  request: InsertStudentTimeEditRequest,
): Promise<StudentTimeEditRequestRow> {
  const [created] = await db.insert(studentTimeEditRequests).values(request).returning();
  return created;
}

export async function getStudentTimeEditRequest(id: string): Promise<StudentTimeEditRequestRow | undefined> {
  const [row] = await db.select().from(studentTimeEditRequests).where(eq(studentTimeEditRequests.id, id));
  return row;
}

export async function getPendingEditRequestForEntry(
  timeEntryId: string,
): Promise<StudentTimeEditRequestRow | undefined> {
  const [row] = await db
    .select()
    .from(studentTimeEditRequests)
    .where(and(eq(studentTimeEditRequests.timeEntryId, timeEntryId), eq(studentTimeEditRequests.status, "pending")))
    .limit(1);
  return row;
}

export async function listStudentTimeEditRequests(
  filters: { studentId?: string; status?: string } = {},
): Promise<StudentTimeEditRequestRow[]> {
  const clauses = [];
  if (filters.studentId) clauses.push(eq(studentTimeEditRequests.studentId, filters.studentId));
  if (filters.status) clauses.push(eq(studentTimeEditRequests.status, filters.status));
  return db
    .select()
    .from(studentTimeEditRequests)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(studentTimeEditRequests.createdAt));
}

export async function countPendingStudentTimeEditRequests(studentId?: string): Promise<number> {
  const clauses = [eq(studentTimeEditRequests.status, "pending")];
  if (studentId) clauses.push(eq(studentTimeEditRequests.studentId, studentId));
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studentTimeEditRequests)
    .where(and(...clauses));
  return row?.count ?? 0;
}

export async function reviewStudentTimeEditRequest(
  id: string,
  values: {
    status: "approved" | "denied";
    adminNote?: string | null;
    reviewedById: string;
    reviewedByName: string;
    reviewedAt: Date;
  },
): Promise<StudentTimeEditRequestRow | undefined> {
  const [updated] = await db
    .update(studentTimeEditRequests)
    .set({
      status: values.status,
      adminNote: values.adminNote ?? null,
      reviewedById: values.reviewedById,
      reviewedByName: values.reviewedByName,
      reviewedAt: values.reviewedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(studentTimeEditRequests.id, id), eq(studentTimeEditRequests.status, "pending")))
    .returning();
  return updated;
}

export async function listStudents() {
  return db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.role, "student"))
    .orderBy(users.lastName, users.firstName, users.username);
}
