import {
  uploads,
  emergencyContacts,
  aiAgentLogs,
  type Upload,
  type InsertUpload,
  type EmergencyContact,
  type InsertEmergencyContact,
  type AiAgentLog,
  type InsertAiAgentLog,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, or, ne, desc, isNull, sql } from "drizzle-orm";

export async function createUpload(uploadData: InsertUpload): Promise<Upload> {
  console.log("DB: Inserting upload data:", JSON.stringify(uploadData, null, 2));
  const [upload] = await db.insert(uploads).values(uploadData).returning();
  return upload;
}

export async function getUploadsByRequest(requestId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.requestId, requestId))
    .orderBy(uploads.createdAt);
}

export async function getUploadsByTask(taskId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.taskId, taskId))
    .orderBy(uploads.createdAt);
}

export async function getUploadsByEquipment(equipmentId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.equipmentId, equipmentId))
    .orderBy(uploads.createdAt);
}

export async function getUploadsByVehicleCheckOutLog(checkOutLogId: string): Promise<Upload[]> {
  console.log("Fetching uploads for checkout log:", checkOutLogId);
  const results = await db
    .select()
    .from(uploads)
    .where(eq(uploads.vehicleCheckOutLogId, checkOutLogId))
    .orderBy(uploads.createdAt);
  console.log("Found uploads:", results.length);
  return results;
}

export async function getUploadsByVehicleCheckInLog(checkInLogId: string): Promise<Upload[]> {
  return await db
    .select()
    .from(uploads)
    .where(eq(uploads.vehicleCheckInLogId, checkInLogId))
    .orderBy(uploads.createdAt);
}

export async function getUpload(id: string): Promise<Upload | undefined> {
  const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
  return upload;
}

export async function deleteUpload(id: string): Promise<void> {
  await db.delete(uploads).where(eq(uploads.id, id));
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  return await db
    .select()
    .from(emergencyContacts)
    .orderBy(desc(emergencyContacts.createdAt));
}

export async function getActiveEmergencyContact(): Promise<EmergencyContact | undefined> {
  const now = new Date();
  const [contact] = await db
    .select()
    .from(emergencyContacts)
    .where(
      and(
        eq(emergencyContacts.isActive, true),
        or(
          isNull(emergencyContacts.validFrom),
          sql`${emergencyContacts.validFrom} <= ${now}`
        ),
        or(
          isNull(emergencyContacts.validUntil),
          sql`${emergencyContacts.validUntil} >= ${now}`
        )
      )
    )
    .orderBy(desc(emergencyContacts.updatedAt))
    .limit(1);
  return contact;
}

export async function getEmergencyContact(id: string): Promise<EmergencyContact | undefined> {
  const [contact] = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.id, id));
  return contact;
}

export async function createEmergencyContact(contactData: InsertEmergencyContact): Promise<EmergencyContact> {
  if (contactData.isActive) {
    await db
      .update(emergencyContacts)
      .set({ isActive: false, updatedAt: new Date() });
  }
  
  const [contact] = await db
    .insert(emergencyContacts)
    .values(contactData)
    .returning();
  return contact;
}

export async function updateEmergencyContact(
  id: string,
  data: Partial<InsertEmergencyContact>
): Promise<EmergencyContact | undefined> {
  if (data.isActive) {
    await db
      .update(emergencyContacts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(ne(emergencyContacts.id, id));
  }

  const [contact] = await db
    .update(emergencyContacts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(emergencyContacts.id, id))
    .returning();
  return contact;
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
}

export async function setActiveEmergencyContact(id: string): Promise<EmergencyContact | undefined> {
  await db
    .update(emergencyContacts)
    .set({ isActive: false, updatedAt: new Date() });
  
  const [contact] = await db
    .update(emergencyContacts)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(emergencyContacts.id, id))
    .returning();
  return contact;
}

export async function clearActiveEmergencyContact(): Promise<void> {
  await db
    .update(emergencyContacts)
    .set({ isActive: false, updatedAt: new Date() });
}

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
