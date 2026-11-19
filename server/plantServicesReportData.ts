import { format } from "date-fns";
import { and, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import {
  attributePurchaseAmounts,
  buildPlantServicesReport,
  type PlantServicesReport,
  type ReportPurchaseInput,
} from "@shared/plantServicesReport";
import { purchaseLinks, purchaseRefunds, purchases, tasks, timeEntries, users } from "@shared/schema";
import { db } from "./db";
import { parseCsvIds, parseLocalDayEnd, parseLocalDayStart, parsePropertyIds } from "./localDates";

export interface ReportingQuery {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  technicianId?: string;
}

function personName(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  fallback: string | null;
}): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.fallback || user.username || "Technician";
}

function isoDay(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

function minutesOf(entry: { durationMinutes: number | null; startTime: Date | null; endTime: Date | null }): number {
  if (entry.durationMinutes && entry.durationMinutes > 0) return entry.durationMinutes;
  if (entry.startTime && entry.endTime) {
    const diff = Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }
  return 0;
}

export async function loadPlantServicesReport(query: ReportingQuery): Promise<PlantServicesReport> {
  const startDate = query.startDate ?? "";
  const endDate = query.endDate ?? "";
  const preparedOn = format(new Date(), "yyyy-MM-dd");
  const empty = () =>
    buildPlantServicesReport({ startDate, endDate, preparedOn, tasks: [], time: [], purchases: [] });

  const where = [];
  where.push(eq(tasks.status, "completed"));
  where.push(isNotNull(tasks.actualCompletionDate));
  if (startDate) where.push(gte(tasks.actualCompletionDate, parseLocalDayStart(startDate)));
  if (endDate) where.push(lte(tasks.actualCompletionDate, parseLocalDayEnd(endDate)));
  const propertyIds = parsePropertyIds(query.propertyId);
  if (propertyIds.length === 1) {
    where.push(or(eq(tasks.propertyId, propertyIds[0]), sql`${propertyIds[0]} = ANY(${tasks.propertyIds})`)!);
  } else if (propertyIds.length > 1) {
    const idList = sql.join(propertyIds.map((id) => sql`${id}`), sql`, `);
    where.push(or(inArray(tasks.propertyId, propertyIds), sql`${tasks.propertyIds} && ARRAY[${idList}]::text[]`)!);
  }

  const taskRows = await db
    .select({
      id: tasks.id,
      completedAt: tasks.actualCompletionDate,
      propertyName: tasks.propertyName,
      location: tasks.spaceName,
      description: tasks.description,
      name: tasks.name,
      priority: tasks.urgency,
      status: tasks.status,
    })
    .from(tasks)
    .where(and(...where));

  if (taskRows.length === 0) return empty();

  const technicianRows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
    })
    .from(users)
    .where(eq(users.role, "technician"));
  const technicianIds = new Set(technicianRows.map((user) => user.id));
  const requested = parseCsvIds(query.technicianId);
  const selected = requested.filter((id) => technicianIds.has(id));
  if (requested.length > 0 && selected.length === 0) return empty();
  const selectedIds = selected.length > 0 ? new Set(selected) : null;

  const taskIds = taskRows.map((task) => task.id);
  const entryRows = await db
    .select({
      taskId: timeEntries.taskId,
      userId: timeEntries.userId,
      userName: timeEntries.userName,
      durationMinutes: timeEntries.durationMinutes,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      role: users.role,
    })
    .from(timeEntries)
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(inArray(timeEntries.taskId, taskIds));

  const time = entryRows
    .filter((entry) => entry.role === "technician" && entry.userId && (!selectedIds || selectedIds.has(entry.userId)))
    .map((entry) => ({
      taskId: entry.taskId,
      technicianId: entry.userId as string,
      technicianName: personName({
        firstName: entry.firstName,
        lastName: entry.lastName,
        username: entry.username,
        fallback: entry.userName,
      }),
      minutes: minutesOf(entry),
    }))
    .filter((entry) => entry.minutes > 0);

  const workedIds = new Set(time.map((entry) => entry.taskId));
  const reportTasks = taskRows
    .filter((task) => workedIds.has(task.id))
    .map((task) => ({
      id: task.id,
      completedOn: isoDay(task.completedAt),
      propertyName: task.propertyName ?? "",
      location: task.location ?? "",
      description: (task.description || task.name || "").trim(),
      priority: task.priority,
      status: task.status,
    }))
    .filter((task) => task.completedOn);

  if (reportTasks.length === 0) return empty();

  const workedTaskIds = reportTasks.map((task) => task.id);
  const linkRows = await db
    .select({
      purchaseId: purchaseLinks.purchaseId,
      taskId: purchaseLinks.taskId,
      storeName: purchases.storeName,
      description: purchases.description,
      amount: purchases.amount,
      purchasedOn: purchases.purchasedOn,
    })
    .from(purchaseLinks)
    .innerJoin(purchases, eq(purchases.id, purchaseLinks.purchaseId))
    .where(and(inArray(purchaseLinks.taskId, workedTaskIds), isNotNull(purchaseLinks.taskId)));

  const purchaseIds = [...new Set(linkRows.map((row) => row.purchaseId))];
  const refundRows =
    purchaseIds.length === 0
      ? []
      : await db
          .select({ purchaseId: purchaseRefunds.purchaseId, amount: purchaseRefunds.amount })
          .from(purchaseRefunds)
          .where(inArray(purchaseRefunds.purchaseId, purchaseIds));
  const refunds = new Map<string, number>();
  for (const refund of refundRows) {
    refunds.set(refund.purchaseId, (refunds.get(refund.purchaseId) ?? 0) + (Number(refund.amount) || 0));
  }

  const purchaseDetails = new Map<string, { purchasedOn: string; storeName: string; description: string }>();
  const grouped = new Map<string, { amount: number; taskIds: string[] }>();
  for (const link of linkRows) {
    if (!link.taskId) continue;
    purchaseDetails.set(link.purchaseId, {
      purchasedOn: isoDay(link.purchasedOn),
      storeName: link.storeName,
      description: link.description,
    });
    const current = grouped.get(link.purchaseId) ?? {
      amount: Math.max(0, (Number(link.amount) || 0) - (refunds.get(link.purchaseId) ?? 0)),
      taskIds: [],
    };
    current.taskIds.push(link.taskId);
    grouped.set(link.purchaseId, current);
  }

  const shares = attributePurchaseAmounts(
    [...grouped.entries()].map(([id, purchase]) => ({ id, amount: purchase.amount, taskIds: purchase.taskIds })),
    new Set(workedTaskIds),
  );
  const purchaseInputs: ReportPurchaseInput[] = shares.map((share) => {
    const detail = purchaseDetails.get(share.purchaseId);
    return {
      taskId: share.taskId,
      purchasedOn: detail?.purchasedOn ?? "",
      storeName: detail?.storeName ?? "",
      description: detail?.description ?? "",
      amount: share.amount,
    };
  });

  return buildPlantServicesReport({
    startDate,
    endDate,
    preparedOn,
    tasks: reportTasks,
    time,
    purchases: purchaseInputs,
  });
}
