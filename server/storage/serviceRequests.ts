import {
  serviceRequests,
  tasks,
  type ServiceRequest,
  type InsertServiceRequest,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, count, inArray, isNull } from "drizzle-orm";
import { formatUserDisplayName } from "@shared/displayNames";
import { getUser } from "./users";
import { getProperty } from "./facilities";

const SERVICE_REQUEST_LIST_LIMIT = 500;

export async function getServiceRequests(filters?: {
  userId?: string;
  status?: string;
  statuses?: string[];
  limit?: number;
}): Promise<ServiceRequest[]> {
  let query = db.select().from(serviceRequests);

  const conditions = [];
  if (filters?.userId) {
    conditions.push(eq(serviceRequests.requesterId, filters.userId));
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    conditions.push(inArray(serviceRequests.status, filters.statuses as any));
  } else if (filters?.status) {
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
  const payload: InsertServiceRequest = { ...requestData };
  if (payload.requesterId && !payload.requesterName) {
    const user = await getUser(payload.requesterId);
    if (user) payload.requesterName = formatUserDisplayName(user);
  }
  if (payload.propertyId && !payload.propertyName) {
    const property = await getProperty(payload.propertyId);
    if (property) payload.propertyName = property.name;
  }
  const [request] = await db
    .insert(serviceRequests)
    .values(payload)
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

/** Converted requests whose work order was removed should not stay labeled approved. */
export async function repairConvertedRequestsWithoutTasks(): Promise<number> {
  const orphans = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .leftJoin(tasks, eq(tasks.requestId, serviceRequests.id))
    .where(and(eq(serviceRequests.status, "converted_to_task"), isNull(tasks.id)));

  const ids = Array.from(new Set(orphans.map((row) => row.id)));
  if (ids.length === 0) return 0;

  await db
    .update(serviceRequests)
    .set({ status: "under_review", updatedAt: new Date() })
    .where(inArray(serviceRequests.id, ids));

  return ids.length;
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
