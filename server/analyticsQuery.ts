import { db } from "./db";
import {
  tasks,
  serviceRequests,
  users,
  properties,
  areas,
  equipment,
  partsUsed,
  timeEntries,
} from "@shared/schema";
import type { AnalyticsFilters } from "./analyticsService";
import { and, eq, gte, inArray, isNull, lte, or, sql, count, type SQL } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { parseCsvIds, parseDateBasis, parseLocalDayEnd, parseLocalDayStart, parsePropertyIds } from "./localDates";

function applyTaskDateBasis(parts: SQL[], filters: AnalyticsFilters) {
  const basis = parseDateBasis(filters.dateBasis);
  const start = filters.startDate ? parseLocalDayStart(filters.startDate) : undefined;
  const end = filters.endDate ? parseLocalDayEnd(filters.endDate) : undefined;
  if (!start && !end) return;

  if (basis === "completed") {
    if (start) parts.push(gte(tasks.actualCompletionDate, start));
    if (end) parts.push(lte(tasks.actualCompletionDate, end));
    return;
  }
  if (basis === "due") {
    if (start) parts.push(gte(tasks.estimatedCompletionDate, start));
    if (end) parts.push(lte(tasks.estimatedCompletionDate, end));
    return;
  }
  if (basis === "created") {
    if (start) parts.push(gte(tasks.createdAt, start));
    if (end) parts.push(lte(tasks.createdAt, end));
    return;
  }
  if (end) parts.push(lte(tasks.createdAt, end));
  if (start) {
    parts.push(or(isNull(tasks.actualCompletionDate), gte(tasks.actualCompletionDate, start))!);
  }
}

export function buildTaskWhere(filters: AnalyticsFilters): SQL | undefined {
  const parts: SQL[] = [];
  applyTaskDateBasis(parts, filters);
  const propertyIds = parsePropertyIds(filters.propertyId);
  if (propertyIds.length === 1) {
    parts.push(
      or(
        eq(tasks.propertyId, propertyIds[0]),
        sql`${propertyIds[0]} = ANY(${tasks.propertyIds})`
      )!
    );
  } else if (propertyIds.length > 1) {
    const idList = sql.join(propertyIds.map((id) => sql`${id}`), sql`, `);
    parts.push(
      or(
        inArray(tasks.propertyId, propertyIds),
        sql`${tasks.propertyIds} && ARRAY[${idList}]::text[]`
      )!
    );
  }
  if (filters.spaceId) parts.push(eq(tasks.spaceId, filters.spaceId));
  if (filters.areaId) parts.push(eq(tasks.areaId, filters.areaId));
  const technicianIds = parseCsvIds(filters.technicianId);
  if (technicianIds.length === 1) parts.push(eq(tasks.assignedToId, technicianIds[0]));
  else if (technicianIds.length > 1) parts.push(inArray(tasks.assignedToId, technicianIds));
  if (filters.equipmentId) parts.push(eq(tasks.equipmentId, filters.equipmentId));
  if (filters.status) parts.push(eq(tasks.status, filters.status as any));
  if (filters.urgency) parts.push(eq(tasks.urgency, filters.urgency as any));
  return parts.length > 0 ? and(...parts) : undefined;
}

export function buildServiceRequestWhere(filters: AnalyticsFilters): SQL | undefined {
  const parts: SQL[] = [];
  if (filters.startDate) {
    parts.push(gte(serviceRequests.createdAt, parseLocalDayStart(filters.startDate)));
  }
  if (filters.endDate) {
    parts.push(lte(serviceRequests.createdAt, parseLocalDayEnd(filters.endDate)));
  }
  const requestPropertyIds = parsePropertyIds(filters.propertyId);
  if (requestPropertyIds.length === 1) parts.push(eq(serviceRequests.propertyId, requestPropertyIds[0]));
  else if (requestPropertyIds.length > 1) parts.push(inArray(serviceRequests.propertyId, requestPropertyIds));
  if (filters.spaceId) parts.push(eq(serviceRequests.spaceId, filters.spaceId));
  if (filters.areaId) parts.push(eq(serviceRequests.areaId, filters.areaId));
  if (filters.urgency) {
    parts.push(eq(serviceRequests.urgency, filters.urgency as any));
  }
  if (filters.status) {
    parts.push(eq(serviceRequests.status, filters.status as any));
  }
  return parts.length > 0 ? and(...parts) : undefined;
}

export type TaskRow = InferSelectModel<typeof tasks>;

export async function fetchFilteredTasks(filters: AnalyticsFilters): Promise<TaskRow[]> {
  return db.select().from(tasks).where(buildTaskWhere(filters));
}

export async function fetchPartsForTasks(taskIds: string[]) {
  if (taskIds.length === 0) return [];
  return db.select().from(partsUsed).where(inArray(partsUsed.taskId, taskIds));
}

export async function fetchTimeEntriesForTasks(taskIds: string[]) {
  if (taskIds.length === 0) return [];
  return db.select().from(timeEntries).where(inArray(timeEntries.taskId, taskIds));
}

export async function countTasks(where: SQL | undefined): Promise<number> {
  const [row] = await db.select({ value: count() }).from(tasks).where(where);
  return Number(row?.value ?? 0);
}

export async function countTasksByStatus(
  where: SQL | undefined,
): Promise<{ status: string; count: number }[]> {
  const rows = await db
    .select({ status: tasks.status, value: count() })
    .from(tasks)
    .where(where)
    .groupBy(tasks.status);
  return rows.map((r) => ({ status: r.status, count: Number(r.value) }));
}

export async function countTasksByField(
  field: typeof tasks.taskType | typeof tasks.urgency,
  where: SQL | undefined,
): Promise<{ key: string; count: number }[]> {
  const rows = await db
    .select({ key: field, value: count() })
    .from(tasks)
    .where(where)
    .groupBy(field);
  return rows.map((r) => ({ key: String(r.key), count: Number(r.value) }));
}

export async function countOverdueTasks(where: SQL | undefined): Promise<number> {
  const now = new Date();
  const overdueWhere = where
    ? and(where, sql`${tasks.status} <> 'completed'`, sql`${tasks.estimatedCompletionDate} < ${now}`)
    : and(sql`${tasks.status} <> 'completed'`, sql`${tasks.estimatedCompletionDate} < ${now}`);
  return countTasks(overdueWhere);
}

export async function groupTasksByProperty(
  where: SQL | undefined,
  limit = 10,
): Promise<{ propertyId: string; propertyName: string; count: number }[]> {
  const taskRows = where
    ? await db
        .select({ propertyId: tasks.propertyId, propertyIds: tasks.propertyIds })
        .from(tasks)
        .where(where)
    : await db
        .select({ propertyId: tasks.propertyId, propertyIds: tasks.propertyIds })
        .from(tasks);
  const propertyRows = await db.select({ id: properties.id, name: properties.name }).from(properties);
  const propertyNames = new Map(propertyRows.map((p) => [p.id, p.name]));
  const counts = new Map<string, number>();

  for (const task of taskRows) {
    const ids = new Set<string>();
    if (task.propertyId) ids.add(task.propertyId);
    for (const id of task.propertyIds ?? []) ids.add(id);
    for (const id of Array.from(ids)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([propertyId, value]) => ({
      propertyId,
      propertyName: propertyNames.get(propertyId) || "Unknown",
      count: value,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function groupTasksByTaskType(
  where: SQL | undefined,
): Promise<{ taskType: string; count: number }[]> {
  const rows = await countTasksByField(tasks.taskType, where);
  return rows.map((r) => ({ taskType: r.key, count: r.count }));
}

/** Work orders grouped by linked service-request category (or "Direct / other"). */
export async function groupTasksByRequestCategory(
  where: SQL | undefined,
): Promise<{ category: string; count: number }[]> {
  const categoryExpr = sql<string>`COALESCE(NULLIF(TRIM(${serviceRequests.category}), ''), 'Direct / other')`;
  const rows = await db
    .select({ category: categoryExpr, value: count() })
    .from(tasks)
    .leftJoin(serviceRequests, eq(tasks.requestId, serviceRequests.id))
    .where(where)
    .groupBy(categoryExpr)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ category: r.category, count: Number(r.value) }));
}

/** Work orders by requester role (from linked request or task creator). */
export async function groupTasksByRequesterRole(
  where: SQL | undefined,
): Promise<{ role: string; count: number }[]> {
  const requesterId = sql<string>`COALESCE(${serviceRequests.requesterId}, ${tasks.createdById})`;
  const roleExpr = sql<string>`COALESCE(${users.role}, 'unknown')`;
  const rows = await db
    .select({ role: roleExpr, value: count() })
    .from(tasks)
    .leftJoin(serviceRequests, eq(tasks.requestId, serviceRequests.id))
    .leftJoin(users, sql`COALESCE(${serviceRequests.requesterId}, ${tasks.createdById}) = ${users.id}`)
    .where(where)
    .groupBy(roleExpr)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ role: r.role, count: Number(r.value) }));
}

export async function monthlyTaskTrend(
  where: SQL | undefined,
): Promise<{ month: string; count: number; completed: number }[]> {
  const monthKey = sql<string>`to_char(${tasks.createdAt}, 'YYYY-MM')`;
  const createdRows = await db
    .select({ month: monthKey, value: count() })
    .from(tasks)
    .where(where ? and(where, sql`${tasks.createdAt} IS NOT NULL`) : sql`${tasks.createdAt} IS NOT NULL`)
    .groupBy(monthKey);

  const completedMonth = sql<string>`to_char(${tasks.actualCompletionDate}, 'YYYY-MM')`;
  const completedWhere = where
    ? and(where, eq(tasks.status, "completed"), sql`${tasks.actualCompletionDate} IS NOT NULL`)
    : and(eq(tasks.status, "completed"), sql`${tasks.actualCompletionDate} IS NOT NULL`);
  const completedRows = await db
    .select({ month: completedMonth, value: count() })
    .from(tasks)
    .where(completedWhere)
    .groupBy(completedMonth);

  const map = new Map<string, { count: number; completed: number }>();
  for (const r of createdRows) {
    map.set(r.month, { count: Number(r.value), completed: 0 });
  }
  for (const r of completedRows) {
    const entry = map.get(r.month) ?? { count: 0, completed: 0 };
    entry.completed = Number(r.value);
    map.set(r.month, entry);
  }
  return Array.from(map.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
}

export async function countServiceRequests(where: SQL | undefined): Promise<number> {
  const [row] = await db.select({ value: count() }).from(serviceRequests).where(where);
  return Number(row?.value ?? 0);
}

export async function countServiceRequestsByStatus(
  where: SQL | undefined,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: serviceRequests.status, value: count() })
    .from(serviceRequests)
    .where(where)
    .groupBy(serviceRequests.status);
  const map: Record<string, number> = {};
  for (const r of rows) {
    map[r.status] = Number(r.value);
  }
  return map;
}

export async function groupServiceRequestsByCategory(
  where: SQL | undefined,
): Promise<{ category: string; count: number }[]> {
  const categoryExpr = sql<string>`COALESCE(NULLIF(TRIM(${serviceRequests.category}), ''), 'Uncategorized')`;
  const rows = await db
    .select({ category: categoryExpr, value: count() })
    .from(serviceRequests)
    .where(where)
    .groupBy(categoryExpr)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ category: r.category, count: Number(r.value) }));
}

/** Average hours requests have been in their current status (age in stage). */
export async function avgHoursInCurrentStatus(
  status: "pending" | "under_review" | "converted_to_task" | "rejected",
  where: SQL | undefined,
): Promise<number | null> {
  const statusWhere = where
    ? and(where, eq(serviceRequests.status, status))
    : eq(serviceRequests.status, status);
  const [row] = await db
    .select({
      avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (NOW() - ${serviceRequests.createdAt})) / 3600)`,
    })
    .from(serviceRequests)
    .where(statusWhere);
  const val = row?.avgHours;
  if (val == null || Number.isNaN(Number(val))) return null;
  return Math.round(Number(val));
}
