import {
  serviceRequests,
  type ServiceRequest,
  type InsertServiceRequest,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";

export async function getServiceRequests(filters?: {
  userId?: string;
  status?: string;
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

  return await query.orderBy(desc(serviceRequests.createdAt));
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
