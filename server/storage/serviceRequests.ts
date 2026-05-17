import {
  serviceRequests,
  type ServiceRequest,
  type InsertServiceRequest,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, count, inArray } from "drizzle-orm";

const SERVICE_REQUEST_LIST_LIMIT = 500;

export async function getServiceRequests(filters?: {
  userId?: string;
  status?: string;
  limit?: number;
}): Promise<ServiceRequest[]> {
  let query = db.select().from(serviceRequests);

  const conditions = [];
  if (filters?.userId) {
    conditions.push(eq(serviceRequests.requesterId, filters.userId));
  }
  if (filters?.status) {
    conditions.push(eq(serviceRequests.status, filters.status as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(serviceRequests.createdAt)) as any;
  const rowLimit = filters?.limit ?? SERVICE_REQUEST_LIST_LIMIT;
  return await (query as any).limit(rowLimit);
}

export async function countServiceRequests(filters?: {
  userId?: string;
  statuses?: string[];
}): Promise<number> {
  const conditions = [];
  if (filters?.userId) {
    conditions.push(eq(serviceRequests.requesterId, filters.userId));
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    conditions.push(inArray(serviceRequests.status, filters.statuses as any));
  }

  let query = db.select({ value: count() }).from(serviceRequests);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  const [row] = await query;
  return Number(row?.value ?? 0);
}

export async function getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, id));
  return request;
}

export async function createServiceRequest(requestData: InsertServiceRequest): Promise<ServiceRequest> {
  const [request] = await db
    .insert(serviceRequests)
    .values(requestData)
    .returning();
  return request;
}

export async function updateServiceRequest(id: string, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined> {
  const [request] = await db
    .update(serviceRequests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(serviceRequests.id, id))
    .returning();
  return request;
}

export async function deleteServiceRequest(id: string): Promise<void> {
  await db.delete(serviceRequests).where(eq(serviceRequests.id, id));
}

export async function updateServiceRequestStatus(
  id: string,
  status: string,
  rejectionReason?: string
): Promise<ServiceRequest | undefined> {
  const [request] = await db
    .update(serviceRequests)
    .set({ status: status as any, rejectionReason, updatedAt: new Date() })
    .where(eq(serviceRequests.id, id))
    .returning();
  return request;
}
