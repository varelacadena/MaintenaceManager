import {
  aiAgentLogs,
  type AiAgentLog,
  type InsertAiAgentLog,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";

export async function createAiAgentLog(log: InsertAiAgentLog): Promise<AiAgentLog> {
  const [created] = await db.insert(aiAgentLogs).values(log).returning();
  return created;
}

export async function getAiAgentLogs(filters?: { status?: string; entityType?: string; limit?: number }): Promise<AiAgentLog[]> {
  let query = db.select().from(aiAgentLogs) as any;
  const conditions = [];
  if (filters?.status) conditions.push(eq(aiAgentLogs.status, filters.status as any));
  if (filters?.entityType) conditions.push(eq(aiAgentLogs.entityType, filters.entityType));
  if (conditions.length > 0) query = query.where(and(...conditions));
  query = query.orderBy(desc(aiAgentLogs.createdAt));
  if (filters?.limit) query = query.limit(filters.limit);
  return await query;
}

export async function updateAiAgentLog(id: string, data: { status: string; reviewedBy?: string }): Promise<AiAgentLog | undefined> {
  const [updated] = await db.update(aiAgentLogs)
    .set({ ...data, reviewedAt: new Date() } as any)
    .where(eq(aiAgentLogs.id, id))
    .returning();
  return updated;
}
