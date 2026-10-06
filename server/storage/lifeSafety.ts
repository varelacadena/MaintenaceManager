import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { lifeSafetyChecks, tasks, type LifeSafetyCheck } from "@shared/schema";

export async function getLifeSafetyChecks(taskId: string): Promise<LifeSafetyCheck[]> {
  return db
    .select()
    .from(lifeSafetyChecks)
    .where(eq(lifeSafetyChecks.taskId, taskId))
    .orderBy(lifeSafetyChecks.sortOrder);
}

export async function getLifeSafetyCheck(id: string): Promise<LifeSafetyCheck | undefined> {
  const [row] = await db.select().from(lifeSafetyChecks).where(eq(lifeSafetyChecks.id, id));
  return row;
}

export async function countPendingLifeSafetyChecks(taskId: string): Promise<number> {
  const rows = await db
    .select({ id: lifeSafetyChecks.id })
    .from(lifeSafetyChecks)
    .where(and(eq(lifeSafetyChecks.taskId, taskId), eq(lifeSafetyChecks.result, "pending")));
  return rows.length;
}

export async function insertLifeSafetyChecks(
  rows: {
    taskId: string;
    equipmentId: string;
    equipmentName: string;
    assetTag?: string | null;
    category: string;
    spaceName?: string | null;
    floor?: string | null;
    sortOrder: number;
  }[],
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(lifeSafetyChecks).values(rows);
}

export async function updateLifeSafetyCheck(
  id: string,
  data: Partial<Pick<LifeSafetyCheck, "result" | "problemNote" | "checkedById" | "checkedByName" | "checkedAt" | "repairTaskId">>,
): Promise<LifeSafetyCheck | undefined> {
  const [row] = await db.update(lifeSafetyChecks).set(data).where(eq(lifeSafetyChecks.id, id)).returning();
  return row;
}

export async function listLifeSafetyPropertyIds(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ propertyId: tasks.propertyId })
    .from(tasks)
    .where(and(eq(tasks.lifeSafetyRound, true)));
  return rows.map((row) => row.propertyId).filter((id): id is string => !!id);
}

export async function getLatestLifeSafetyTask(propertyId: string) {
  const [row] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.lifeSafetyRound, true), eq(tasks.propertyId, propertyId)))
    .orderBy(desc(tasks.initialDate))
    .limit(1);
  return row;
}

export async function lifeSafetyTaskExistsOnDay(propertyId: string, dayStart: Date, dayEnd: Date): Promise<boolean> {
  const [row] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.lifeSafetyRound, true),
        eq(tasks.propertyId, propertyId),
        gte(tasks.initialDate, dayStart),
        lt(tasks.initialDate, dayEnd),
      ),
    )
    .limit(1);
  return !!row;
}
