import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../db";
import { properties, taskPurchases, tasks, type TaskPurchase } from "@shared/schema";

export type TaskPurchaseRecord = TaskPurchase & {
  taskName: string;
  propertyName: string | null;
};

export async function listTaskPurchases(taskId: string): Promise<TaskPurchase[]> {
  return db
    .select()
    .from(taskPurchases)
    .where(eq(taskPurchases.taskId, taskId))
    .orderBy(asc(taskPurchases.purchasedOn), asc(taskPurchases.createdAt));
}

export async function getTaskPurchase(id: string): Promise<TaskPurchase | undefined> {
  const [row] = await db.select().from(taskPurchases).where(eq(taskPurchases.id, id));
  return row;
}

export async function createTaskPurchase(
  values: typeof taskPurchases.$inferInsert,
): Promise<TaskPurchase> {
  const [row] = await db.insert(taskPurchases).values(values).returning();
  return row;
}

export async function updateTaskPurchase(
  id: string,
  values: Partial<typeof taskPurchases.$inferInsert>,
): Promise<TaskPurchase | undefined> {
  const [row] = await db
    .update(taskPurchases)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(taskPurchases.id, id))
    .returning();
  return row;
}

export async function deleteTaskPurchase(id: string): Promise<void> {
  await db.delete(taskPurchases).where(eq(taskPurchases.id, id));
}

export async function listPurchasesForPeriod(filters: {
  startDate?: string;
  endDate?: string;
  propertyIds?: string[];
}): Promise<TaskPurchaseRecord[]> {
  const conditions = [];
  if (filters.startDate) conditions.push(gte(taskPurchases.purchasedOn, filters.startDate));
  if (filters.endDate) conditions.push(lte(taskPurchases.purchasedOn, filters.endDate));
  if (filters.propertyIds && filters.propertyIds.length > 0) {
    conditions.push(inArray(tasks.propertyId, filters.propertyIds));
  }

  const rows = await db
    .select({
      purchase: taskPurchases,
      taskName: tasks.name,
      propertyName: properties.name,
    })
    .from(taskPurchases)
    .innerJoin(tasks, eq(taskPurchases.taskId, tasks.id))
    .leftJoin(properties, eq(tasks.propertyId, properties.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(taskPurchases.purchasedOn), asc(taskPurchases.storeName));

  return rows.map((row) => ({
    ...row.purchase,
    taskName: row.taskName,
    propertyName: row.propertyName,
  }));
}
